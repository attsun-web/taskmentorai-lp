// ai2json.jsx — Adobe Illustrator（.ai）内で実行される抽出エンジン本体。
//
// 呼び出し側のラッパーjsxが生成する処理から呼び出される想定。ラッパーは
// このファイルの内容をそのまま末尾に連結し、以下のグローバル変数を
// 事前に定義してから実行する（このファイル単体では動作しない）:
//
//   AI_SOURCE_PATH        入力.aiファイルの絶対パス
//   AI_OUTPUT_JSON_PATH   生ノードJSON書き出し先の絶対パス
//   AI_PREVIEW_DIR        アートボードPNG書き出し先ディレクトリ（絶対パス）
//   AI_MARKER_DONE_PATH   正常完了マーカーファイルの絶対パス
//   AI_MARKER_ERROR_PATH  異常終了時にエラー内容を書くファイルの絶対パス
//   AI_PROGRESS_PATH      アートボード単位の進捗を書き出すファイルの絶対パス
//
// 設計方針（static-code_AI対応_仕様書.md §7 = PoC実証済み。変更しないこと）:
//   - app.userInteractionLevel = DONTDISPLAYALERTS でダイアログを抑止
//   - 開いたドキュメントは保存せず close(SaveOptions.DONOTSAVECHANGES)
//   - 座標変換: localX = x - abLeft, localY = abTop - y（Y軸反転・左上原点px化）
//   - アートボードPNG: doc.imageCapture(file, rect, {resolution:72}）
//   - 完了/エラーはマーカーファイルで通知（戻り値はosascript側で使えないため）
//   - doc.textFrames 等の doc 直下コレクションはドキュメント全体を横断する
//     フラットな集計値であり、各ノードの所属アートボードは中心点で個別判定する
//
// ES3相当の制約（ExtendScript）: JSON.stringifyが無い前提で軽量シリアライザを
// 内蔵する。let/const・アロー関数・テンプレートリテラル・Array.forEach等は使わない。

(function () {
    if (typeof AI_SOURCE_PATH === "undefined") {
        throw new Error("AI_SOURCE_PATH が定義されていません（ラッパーjsxの生成に問題があります）");
    }

    // -----------------------------------------------------------------------
    // ユーティリティ
    // -----------------------------------------------------------------------

    function writeUtf8(path, content) {
        var f = new File(path);
        f.encoding = "UTF-8";
        f.open("w");
        f.write(content);
        f.close();
    }

    function r2(n) {
        if (n === null || n === undefined || isNaN(n)) return 0;
        return Math.round(n * 100) / 100;
    }

    function ri(n) {
        if (n === null || n === undefined || isNaN(n)) return 0;
        return Math.round(n);
    }

    function safeName(item) {
        try {
            return item.name || "";
        } catch (e) {
            return "";
        }
    }

    // -----------------------------------------------------------------------
    // 軽量JSONシリアライザ（ES3: JSON.stringifyが無い前提）
    // -----------------------------------------------------------------------

    function jsonStr(s) {
        s = String(s);
        var out = '"';
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            var code = s.charCodeAt(i);
            if (c === '"') out += '\\"';
            else if (c === '\\') out += '\\\\';
            else if (c === '\n') out += '\\n';
            else if (c === '\r') out += '\\r';
            else if (c === '\t') out += '\\t';
            else if (code < 0x20) {
                var hex = code.toString(16);
                while (hex.length < 4) hex = "0" + hex;
                out += '\\u' + hex;
            } else {
                out += c;
            }
        }
        return out + '"';
    }

    function jsonVal(v) {
        if (v === null || v === undefined) return "null";
        var t = typeof v;
        if (t === "number") return isFinite(v) ? String(v) : "0";
        if (t === "boolean") return v ? "true" : "false";
        if (t === "string") return jsonStr(v);
        if (v instanceof Array) {
            var parts = [];
            for (var i = 0; i < v.length; i++) parts.push(jsonVal(v[i]));
            return "[" + parts.join(",") + "]";
        }
        if (t === "object") {
            var parts2 = [];
            for (var k in v) {
                if (!v.hasOwnProperty || v.hasOwnProperty(k)) {
                    parts2.push(jsonStr(k) + ":" + jsonVal(v[k]));
                }
            }
            return "{" + parts2.join(",") + "}";
        }
        return "null";
    }

    // -----------------------------------------------------------------------
    // メイン処理
    // -----------------------------------------------------------------------

    var doc = null;
    var warnings = [];

    try {
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var srcFile = new File(AI_SOURCE_PATH);
        if (!srcFile.exists) {
            throw new Error("SOURCE_NOT_FOUND: " + AI_SOURCE_PATH);
        }

        doc = app.open(srcFile);

        // ---- 色変換（CMYK/Gray/Spot -> RGB hex。防御的実装＋警告つき: §7.2/§3.2） ----
        var cmykWarned = false;

        function rgbHex(r, g, b) {
            r = Math.max(0, Math.min(255, Math.round(r)));
            g = Math.max(0, Math.min(255, Math.round(g)));
            b = Math.max(0, Math.min(255, Math.round(b)));
            function h2(n) {
                var s = n.toString(16).toUpperCase();
                return s.length < 2 ? "0" + s : s;
            }
            return "#" + h2(r) + h2(g) + h2(b);
        }

        function colorToHex(color) {
            try {
                if (!color) return null;
                var t = color.typename;
                if (t === "RGBColor") {
                    return rgbHex(color.red, color.green, color.blue);
                }
                if (t === "GrayColor") {
                    // GrayColor.gray: 0(黒)-100(白)。念のため防御的に扱う（実データ未検証のため判定要注意）。
                    var g = Math.round(255 * (color.gray / 100));
                    return rgbHex(g, g, g);
                }
                if (t === "CMYKColor") {
                    if (!cmykWarned) {
                        warnings.push("CMYKドキュメントの色をRGBへ近似変換しています（実データでの検証は未実施。目視確認推奨）");
                        cmykWarned = true;
                    }
                    try {
                        var srcVals = [color.cyan, color.magenta, color.yellow, color.black];
                        var rgbVals = app.convertSampleColor(
                            ImageColorSpace.CMYK, srcVals, ImageColorSpace.RGB, ColorConvertPurpose.defaultpurpose
                        );
                        return rgbHex(rgbVals[0], rgbVals[1], rgbVals[2]);
                    } catch (eConv) {
                        // convertSampleColorが使えない場合の簡易近似式（フォールバック）
                        var c = color.cyan / 100, m = color.magenta / 100, y = color.yellow / 100, k = color.black / 100;
                        return rgbHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
                    }
                }
                if (t === "SpotColor") {
                    return colorToHex(color.spot.color);
                }
                return null; // GradientColor/PatternColor/NoColor等は呼び出し側で個別判定
            } catch (e) {
                return null;
            }
        }

        // ---- アートボード一覧（名前・rect: §3.2） ----
        var artboards = [];
        for (var ai = 0; ai < doc.artboards.length; ai++) {
            var ab = doc.artboards[ai];
            var rect = ab.artboardRect; // [left, top, right, bottom]（Y軸上向きグローバル座標。§7.2）
            artboards.push({
                name: ab.name,
                left: rect[0], top: rect[1], right: rect[2], bottom: rect[3],
                width: r2(rect[2] - rect[0]),
                height: r2(rect[1] - rect[3]),
                nodes: [],
                previewFile: null
            });
        }
        if (artboards.length === 0) {
            throw new Error("NO_ARTBOARDS: アートボードが1件も見つかりません");
        }

        function localXY(ab, gx, gy) {
            return [ri(gx - ab.left), ri(ab.top - gy)]; // §7.2実証済みの変換式（変更禁止）
        }

        function findArtboardIndex(px, py) {
            for (var i = 0; i < artboards.length; i++) {
                var a = artboards[i];
                if (px >= a.left && px <= a.right && py <= a.top && py >= a.bottom) {
                    return i;
                }
            }
            return -1;
        }

        function nodeCenter(item) {
            var t;
            try { t = item.typename; } catch (eT) { t = null; }
            if (t === "TextFrame") {
                try {
                    var pos = item.position;
                    return [pos[0], pos[1]];
                } catch (eP) { /* fall through */ }
            }
            try {
                var gb = item.geometricBounds; // [left, top, right, bottom]
                return [(gb[0] + gb[2]) / 2, (gb[1] + gb[3]) / 2];
            } catch (eG) {
                try {
                    var pos2 = item.position;
                    return [pos2[0], pos2[1]];
                } catch (eP2) {
                    return [0, 0];
                }
            }
        }

        // ---- テキスト部分装飾（ranges）判定: §3.2 point 12 ----
        // ES3効率対策: 40文字超のフレームはまず先頭/中央/末尾のみ比較し、
        // 3点とも一致すれば単一スタイルとみなしてフル走査を省略する（短絡）。
        function charAttrsSnapshot(range) {
            var ca = range.characterAttributes;
            var snap = {};
            try { snap.family = ca.textFont.name; } catch (e1) { snap.family = null; }
            try { snap.size = r2(ca.size); } catch (e2) { snap.size = null; }
            try { snap.tracking = ca.tracking; } catch (e3) { snap.tracking = null; }
            try { snap.color = colorToHex(ca.fillColor); } catch (e4) { snap.color = null; }
            try { snap.leading = r2(ca.leading); } catch (e5) { snap.leading = null; }
            return snap;
        }

        function snapEqual(a, b) {
            return a.family === b.family && a.size === b.size && a.tracking === b.tracking
                && a.color === b.color && a.leading === b.leading;
        }

        function buildRanges(tf) {
            var len = 0;
            try { len = tf.contents.length; } catch (eLen) { return null; }
            if (len === 0) return null;
            var chars;
            try { chars = tf.characters; } catch (eCh) { return null; }
            if (!chars || chars.length !== len) return null; // 想定外構造は安全側で省略

            if (len > 40) {
                try {
                    var s0 = charAttrsSnapshot(chars[0]);
                    var sMid = charAttrsSnapshot(chars[Math.floor(len / 2)]);
                    var sLast = charAttrsSnapshot(chars[len - 1]);
                    if (snapEqual(s0, sMid) && snapEqual(sMid, sLast)) {
                        return null; // 単一スタイルとみなす
                    }
                } catch (eProbe) { /* フル走査へフォールバック */ }
            }

            var runs = [];
            var curSnap = null;
            var curLen = 0;
            for (var i = 0; i < len; i++) {
                var snap;
                try { snap = charAttrsSnapshot(chars[i]); } catch (eSnap) { continue; }
                if (curSnap && snapEqual(curSnap, snap)) {
                    curLen++;
                } else {
                    if (curSnap) runs.push({ snap: curSnap, length: curLen });
                    curSnap = snap;
                    curLen = 1;
                }
            }
            if (curSnap) runs.push({ snap: curSnap, length: curLen });
            if (runs.length < 2) return null;

            var out = [];
            for (var j = 0; j < runs.length; j++) {
                var rr = runs[j];
                var entry = { length: rr.length };
                if (rr.snap.family) entry.family = rr.snap.family;
                if (rr.snap.size !== null) entry.size = rr.snap.size;
                if (rr.snap.tracking !== null) entry.letterSpacing = rr.snap.tracking;
                if (rr.snap.color) entry.color = rr.snap.color;
                out.push(entry);
            }
            return out;
        }

        function justToStr(j) {
            try {
                if (j === Justification.LEFT) return "left";
                if (j === Justification.RIGHT) return "right";
                if (j === Justification.CENTER) return "center";
                return "justify"; // FULLJUSTIFY系はすべてjustifyへ集約
            } catch (e) {
                return "left";
            }
        }

        // ---- テキストノード ----
        // xyへの変換は他ノードのgeometricBounds(_gb)と同様、localizeTree()で
        // アートボード確定後にまとめて行う（_posに生のグローバル座標を保持する）。
        function buildTextNode(tf) {
            var pos = tf.position;
            var node = { name: safeName(tf), type: "text", _pos: [pos[0], pos[1]], text: tf.contents };

            var font = {};
            try {
                var ca = tf.textRange.characterAttributes;
                try { font.family = ca.textFont.name; } catch (e1) {}
                try { font.size = r2(ca.size); } catch (e2) {}
                try { font.letterSpacing = ca.tracking; } catch (e3) {} // AV値のまま（÷1000emはHTML変換側）
                try { font.lineHeight = r2(ca.leading); } catch (e4) {} // 共通データ契約のキー名はlineHeight
                try { font.autoLeading = ca.autoLeading; } catch (e5) {}
                try {
                    var hex = colorToHex(ca.fillColor);
                    if (hex) node.color = hex;
                } catch (e6) {}
            } catch (eCA) {}

            try {
                var just;
                try { just = tf.paragraphs[0].paragraphAttributes.justification; }
                catch (eJ1) {
                    try { just = tf.textRange.paragraphAttributes.justification; }
                    catch (eJ2) { just = tf.textRange.justification; }
                }
                font.align = justToStr(just);
            } catch (eJust) {}

            if (font.family !== undefined || font.size !== undefined) node.font = font;

            var ranges = buildRanges(tf);
            if (ranges) node.ranges = ranges;

            return node;
        }

        // ---- パス/コンパウンドパス（塗り・線）: §3.2 point 13 ----
        function extractStrokeDashes(item) {
            try {
                if (item.strokeDashes && item.strokeDashes.length > 0) {
                    var arr = [];
                    for (var i = 0; i < item.strokeDashes.length; i++) arr.push(r2(item.strokeDashes[i]));
                    return arr;
                }
            } catch (e) {}
            return null;
        }

        function buildPathNode(item) {
            var gb;
            try { gb = item.geometricBounds; } catch (e) { return null; }
            var left = gb[0], top = gb[1], right = gb[2], bottom = gb[3];
            var isCompound = (item.typename === "CompoundPathItem");
            var node = { name: safeName(item), type: isCompound ? "compound" : "path", _gb: [left, top, right, bottom] };

            var rep = item;
            if (isCompound) {
                try {
                    if (item.pathItems && item.pathItems.length > 0) rep = item.pathItems[0];
                } catch (eRep) {}
            }

            var filled = false, stroked = false;
            try { filled = rep.filled; } catch (eF) {}
            try { stroked = rep.stroked; } catch (eS) {}

            if (filled) {
                try {
                    var fc = rep.fillColor;
                    var hex = colorToHex(fc);
                    if (hex) node.fill = hex;
                    else if (fc && fc.typename === "GradientColor") node.fill = { gradient: true };
                    else if (fc && fc.typename === "PatternColor") node.fill = { pattern: true };
                } catch (eFc) {}
            }
            if (stroked) {
                try {
                    var strokeOut = { color: colorToHex(rep.strokeColor), w: r2(rep.strokeWidth) };
                    var dash = extractStrokeDashes(rep);
                    if (dash) strokeOut.dash = dash;
                    node.stroke = strokeOut;
                } catch (eSt) {}
            }
            try {
                var op = item.opacity;
                if (op !== undefined && r2(op / 100) !== 1) node.opacity = r2(op / 100);
            } catch (eOp) {}

            return node;
        }

        // ---- 画像（配置/埋め込み）: §3.2 point 6行目 ----
        function buildPlacedNode(item) {
            var gb;
            try { gb = item.geometricBounds; } catch (e) { return null; }
            var node = { name: safeName(item), type: "image-layer", _gb: [gb[0], gb[1], gb[2], gb[3]] };
            var fsName = null;
            try { fsName = item.file.fsName; } catch (eFs) { fsName = null; }
            node._linkedFile = fsName; // Python側がimages/へコピー後、imageキーへ付け替える
            try {
                var op = item.opacity;
                if (op !== undefined && r2(op / 100) !== 1) node.opacity = r2(op / 100);
            } catch (eOp) {}
            return node;
        }

        function buildRasterNode(item) {
            var gb;
            try { gb = item.geometricBounds; } catch (e) { return null; }
            var node = {
                name: safeName(item), type: "image-layer", _gb: [gb[0], gb[1], gb[2], gb[3]],
                note: "埋め込み画像（原本取得不可・アートボードPNGで代替確認してください）"
            };
            try {
                var op = item.opacity;
                if (op !== undefined && r2(op / 100) !== 1) node.opacity = r2(op / 100);
            } catch (eOp) {}
            return node;
        }

        // ---- グループ（階層保持）: §3.2 point 15 ----
        function buildGroupNode(item, depth) {
            if (depth > 40) {
                warnings.push("走査深度が異常に深いため打ち切りました（循環参照の可能性）: " + safeName(item));
                return null;
            }
            var gb = null;
            try { gb = item.geometricBounds; } catch (e) {}
            var children = [];
            var kids;
            try { kids = item.pageItems; } catch (eKids) { kids = null; }
            if (kids) {
                for (var i = 0; i < kids.length; i++) {
                    var childNode = walkItem(kids[i], depth + 1);
                    if (childNode) children.push(childNode);
                }
            }
            var node = { name: safeName(item), type: "group", children: children };
            if (gb) node._gb = [gb[0], gb[1], gb[2], gb[3]];
            try { if (item.clipped) node.mask = true; } catch (eClip) {}
            try {
                var op = item.opacity;
                if (op !== undefined && r2(op / 100) !== 1) node.opacity = r2(op / 100);
            } catch (eOp) {}
            return node;
        }

        function countTextFramesRecursive(item) {
            var t;
            try { t = item.typename; } catch (e) { return 0; }
            if (t === "TextFrame") return 1;
            if (t === "GroupItem") {
                var total = 0;
                try {
                    var kids = item.pageItems;
                    for (var i = 0; i < kids.length; i++) total += countTextFramesRecursive(kids[i]);
                } catch (eKids) {}
                return total;
            }
            return 0;
        }

        // ---- ノードtype振り分け（§3.2 point 10: 全種別を走査） ----
        function walkItem(item, depth) {
            try { if (item.hidden === true) return null; } catch (eH) {}
            var t;
            try { t = item.typename; } catch (eT) { return null; }

            if (t === "GroupItem") return buildGroupNode(item, depth);
            if (t === "TextFrame") return buildTextNode(item);
            if (t === "CompoundPathItem") return buildPathNode(item);
            if (t === "PathItem") return buildPathNode(item);
            if (t === "PlacedItem") return buildPlacedNode(item);
            if (t === "RasterItem") return buildRasterNode(item);

            // 未知typename: 黙って捨てず、bboxのみの汎用ノードとして残す
            try {
                var gb2 = item.geometricBounds;
                warnings.push("未知のノードtype '" + t + "' を検出しました（name=" + safeName(item) + "）");
                return { name: safeName(item), type: "unknown:" + t, _gb: [gb2[0], gb2[1], gb2[2], gb2[3]] };
            } catch (eGb) {
                return null;
            }
        }

        // _gb（ドキュメント絶対座標のgeometricBounds）または_pos（テキストの原点）を、
        // 指定アートボード基準のローカルpx xy(/w/h) に変換する（再帰的に全ノードへ適用）。
        // ルーティング(Pass1)は中心点判定のみで属性抽出前のため、実際の座標変換は
        // 所属アートボードが確定したPass2でこの関数によりまとめて行う。
        function localizeTree(node, ab) {
            if (!node) return;
            if (node._gb) {
                var gbv = node._gb;
                var xy = localXY(ab, gbv[0], gbv[1]);
                node.xy = xy;
                var w = ri(gbv[2] - gbv[0]);
                var h = ri(gbv[1] - gbv[3]);
                if (w) node.w = w;
                if (h) node.h = h;
                delete node._gb;
            } else if (node._pos) {
                node.xy = localXY(ab, node._pos[0], node._pos[1]);
                delete node._pos;
            }
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) localizeTree(node.children[i], ab);
            }
        }

        // -----------------------------------------------------------------------
        // Pass 1: ルーティング（中心点で所属アートボードを判定。まだ属性抽出はしない）
        // -----------------------------------------------------------------------

        var stats = {
            textFrameCountDoc: doc.textFrames.length,
            pathItemCountDoc: doc.pathItems.length,
            groupItemCountDoc: doc.groupItems.length,
            compoundPathItemCountDoc: doc.compoundPathItems.length,
            placedItemCountDoc: doc.placedItems.length,
            rasterItemCountDoc: doc.rasterItems.length,
            unassignedCount: 0,
            unassignedTextFrameCount: 0
        };

        var buckets = [];
        for (var bi = 0; bi < artboards.length; bi++) buckets.push([]);

        function routeLayers(layers) {
            for (var li = 0; li < layers.length; li++) {
                var layer = layers[li];
                try { if (layer.visible === false) continue; } catch (eVis) {}
                var items;
                try { items = layer.pageItems; } catch (eItems) { items = null; }
                if (items) {
                    for (var ti = 0; ti < items.length; ti++) {
                        var topItem = items[ti];
                        try { if (topItem.hidden === true) continue; } catch (eHid) {}
                        var c = nodeCenter(topItem);
                        var idx = findArtboardIndex(c[0], c[1]);
                        if (idx === -1) {
                            stats.unassignedCount++;
                            stats.unassignedTextFrameCount += countTextFramesRecursive(topItem);
                        } else {
                            buckets[idx].push(topItem);
                        }
                    }
                }
                var subLayers;
                try { subLayers = layer.layers; } catch (eSub) { subLayers = null; }
                if (subLayers && subLayers.length > 0) routeLayers(subLayers);
            }
        }
        routeLayers(doc.layers);

        // -----------------------------------------------------------------------
        // Pass 2: アートボードごとに実抽出 + PNG書き出し + 進捗ファイル更新
        // -----------------------------------------------------------------------

        for (var aidx = 0; aidx < artboards.length; aidx++) {
            var A = artboards[aidx];
            var kids2 = buckets[aidx];
            for (var ki = 0; ki < kids2.length; ki++) {
                var topItem2 = kids2[ki];
                var slim;
                try {
                    slim = walkItem(topItem2, 0);
                    if (slim) localizeTree(slim, A);
                } catch (eWalk) {
                    slim = null;
                    warnings.push("ノード処理に失敗しました(name=" + safeName(topItem2) + "): " + eWalk);
                }
                if (slim) A.nodes.push(slim);
            }

            // アートボードPNG書き出し（resolution 72。§7.3実証済み・変更禁止）
            try {
                var rectArr = [A.left, A.top, A.right, A.bottom];
                var fileSlug = String(aidx) + "_" + String(A.name || "artboard").replace(/[^\w\-]+/g, "_");
                var pngFile = new File(AI_PREVIEW_DIR + "/" + fileSlug + ".png");
                var cap = new ImageCaptureOptions();
                cap.resolution = 72;
                cap.antiAliasing = true;
                cap.transparency = false;
                doc.imageCapture(pngFile, rectArr, cap);
                A.previewFile = fileSlug + ".png";
            } catch (ePng) {
                warnings.push("アートボード'" + A.name + "'のPNG書き出しに失敗しました: " + ePng);
            }

            // 進捗ファイル更新（Python側がポーリングしてstdoutへ1行出す: §3.1 point3）
            try {
                writeUtf8(AI_PROGRESS_PATH, (aidx + 1) + "/" + artboards.length + "\t" + A.name);
            } catch (ePw) {}
        }

        // -----------------------------------------------------------------------
        // 出力JSON組み立て・書き出し
        // -----------------------------------------------------------------------

        var outArtboards = [];
        for (var oi = 0; oi < artboards.length; oi++) {
            var A2 = artboards[oi];
            outArtboards.push({
                name: A2.name,
                width: A2.width,
                height: A2.height,
                previewFile: A2.previewFile,
                children: A2.nodes
            });
        }

        var outObj = {
            docName: doc.name,
            colorSpace: String(doc.documentColorSpace),
            artboards: outArtboards,
            stats: stats,
            warnings: warnings
        };

        writeUtf8(AI_OUTPUT_JSON_PATH, jsonVal(outObj));

        doc.close(SaveOptions.DONOTSAVECHANGES);
        doc = null;

        writeUtf8(AI_MARKER_DONE_PATH, "done");
    } catch (errTop) {
        try { if (doc) doc.close(SaveOptions.DONOTSAVECHANGES); } catch (eClose) {}
        try {
            var msg = "ERROR: " + errTop;
            try { if (errTop && errTop.line) msg += " (line " + errTop.line + ")"; } catch (eLine) {}
            writeUtf8(AI_MARKER_ERROR_PATH, msg);
        } catch (eWriteErr) {}
    }
})();
