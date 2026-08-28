import Splide from "@splidejs/splide";
import { AutoScroll } from "@splidejs/splide-extension-auto-scroll";
import "@splidejs/splide/css/core";

// ========================================
// Initialize
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  initHeaderMenu();
  initPickupSlider();
  initPriceScroll();
  initAccordion();
  initContactForm();
});

// ========================================
// Header Menu（ハンバーガー / SP ドロワー）
// ========================================
function initHeaderMenu() {
  const toggle = document.querySelector(".js-menu-toggle");
  if (!toggle) return;

  const drawer = document.querySelector(".js-drawer");
  if (!drawer) return;

  const overlay = document.querySelector(".js-drawer-overlay");

  // config.local.md のブレークポイント lg（1120px）= PC ヘッダーへ切り替わる幅
  const mql = window.matchMedia("(min-width: 1120px)");

  const setState = isOpen => {
    toggle.classList.toggle("is-open", isOpen);
    drawer.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
    drawer.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("is-drawer-open", isOpen);
    if (overlay) overlay.classList.toggle("is-open", isOpen);
  };

  const closeDrawer = () => setState(false);

  toggle.addEventListener("click", () => {
    setState(!drawer.classList.contains("is-open"));
  });

  if (overlay) overlay.addEventListener("click", closeDrawer);

  drawer.querySelectorAll("a, button").forEach(link => {
    link.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  // PC 幅へリサイズしたときにスクロールロックが残るのを防ぐ
  mql.addEventListener("change", event => {
    if (event.matches) closeDrawer();
  });
}

// ========================================
// Pick Up スライダー（お客様の声・自動横スクロール）
// ========================================
function initPickupSlider() {
  const element = document.querySelector(".js-pickup-slider");
  if (!element) return;

  new Splide(element, {
    type: "loop",
    focus: "center",
    fixedWidth: 300,
    gap: 33,
    arrows: true,
    pagination: true,
    drag: true,
    // 矢印・ドット操作時はスライドしながら切り替える
    speed: 700,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    waitForTransition: true,
    // ゆっくり流れる自動横スクロール（手動操作後も再開する）
    autoScroll: {
      speed: 0.5,
      pauseOnHover: true,
      pauseOnFocus: true,
    },
  }).mount({ AutoScroll });
}

// ========================================
// Price 比較表の横スクロール検知（SCROLL 矢印の表示切り替え）
// ========================================
function initPriceScroll() {
  const scroller = document.querySelector(".js-price-scroll");
  if (!scroller) return;

  const content = scroller.closest(".p-price__content");
  if (!content) return;

  const update = () => {
    const isScrollable = scroller.scrollWidth - scroller.clientWidth > 1;
    content.classList.toggle("is-scrollable", isScrollable);
  };

  update();
  window.addEventListener("resize", update);
}

// ========================================
// よくある質問アコーディオン（1 つ開くと他は閉じる）
// ========================================
function initAccordion() {
  const list = document.querySelector(".js-accordion");
  if (!list) return;

  const toggles = list.querySelectorAll(".js-accordion-toggle");
  // PC カンプはすべての回答が開いた状態のため、md 以上では常に展開扱いにする
  const mql = window.matchMedia("(min-width: 768px)");

  const syncExpandedState = () => {
    if (!mql.matches) return;
    toggles.forEach(toggle => {
      toggle.closest(".p-question__item").classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    });
  };

  syncExpandedState();
  mql.addEventListener("change", syncExpandedState);

  toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      if (mql.matches) return;

      const item = toggle.closest(".p-question__item");
      const willOpen = !item.classList.contains("is-open");

      toggles.forEach(other => {
        const otherItem = other.closest(".p-question__item");
        otherItem.classList.remove("is-open");
        other.setAttribute("aria-expanded", "false");
      });

      if (willOpen) {
        item.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
      }
    });
  });
}

// ========================================
// お問い合わせフォーム（必須チェック・同意チェック）
// ========================================
function initContactForm() {
  const form = document.querySelector(".js-contact-form");
  if (!form) return;

  const agree = form.querySelector(".js-contact-agree");
  const submit = form.querySelector(".js-contact-submit");
  const controls = form.querySelectorAll("input[required], select[required], textarea[required]");

  // 同意チェックが入るまで送信できない
  const updateSubmitState = () => {
    submit.disabled = !agree.checked;
  };

  agree.addEventListener("change", updateSubmitState);
  updateSubmitState();

  const validateControl = control => {
    if (control === agree) return true;

    const field = control.closest(".p-contact__field");
    const isValid = control.value.trim() !== "" && control.checkValidity();
    if (field) field.classList.toggle("is-error", !isValid);
    return isValid;
  };

  controls.forEach(control => {
    control.addEventListener("blur", () => validateControl(control));
  });

  form.addEventListener("submit", event => {
    let firstInvalid = null;

    controls.forEach(control => {
      if (!validateControl(control) && !firstInvalid) firstInvalid = control;
    });

    if (firstInvalid || !agree.checked) {
      event.preventDefault();
      if (firstInvalid) firstInvalid.focus();
    }
  });
}
