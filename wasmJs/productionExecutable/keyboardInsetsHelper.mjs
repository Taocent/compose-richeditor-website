// KeyboardInsetsHelper — wasmJs 平台 visualViewport 监听桥接
//
// 为什么需要单独的 mjs helper (2026-06-14):
// - KGP 1.11.1 wasmJs 不支持 `dynamic` 类型,也不允许在 Composable 函数体内调 `js("window")`
// - `org.w3c.dom.Window` 在 wasmJs 上未导出 `visualViewport`
// - `kotlinx.browser` 在 wasmJs 端 KGP 1.11.1 也不可用
//
// 因此 `:richtext-core:wasmJsMain/.../KeyboardInsetsHelper.wasmJs.kt` 用
// `@JsModule("keyboardInsetsHelper") external object` 引入本文件作为 JS interop 桥接。
// 本文件是纯 ES module,直接用浏览器 API,与 jsMain 端的 `kotlinx.browser.window` 行为一致。
//
// 软键盘高度 = max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop)
//
// 依赖 index.html viewport meta 标记 `interactive-widget=resizes-content`,否则
// `window.visualViewport.height` 不会跟随系统软键盘变化。

export function installKeyboardListeners(onChange) {
    if (typeof window === 'undefined') {
        return () => {};
    }
    const viewport = window.visualViewport;

    function compute() {
        if (!viewport) {
            onChange(0);
            return;
        }
        const innerHeight = window.innerHeight;
        const visualHeight = viewport.height;
        const offsetTop = viewport.offsetTop || 0;
        const raw = innerHeight - visualHeight - offsetTop;
        onChange(raw > 0 ? raw : 0);
    }

    compute();
    // resize 在 visualViewport 维度变化时触发(系统软键盘弹起/收起)
    // scroll 在 iOS Safari 上 visualViewport 滚到地址栏收起时触发
    // window.resize 兜底:visualViewport API 早期实现可能不触发
    if (viewport) {
        viewport.addEventListener('resize', compute);
        viewport.addEventListener('scroll', compute);
    }
    window.addEventListener('resize', compute);

    return function uninstall() {
        if (viewport) {
            viewport.removeEventListener('resize', compute);
            viewport.removeEventListener('scroll', compute);
        }
        window.removeEventListener('resize', compute);
    };
}
