#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|_app| {
      // Desktop debug logging pulls local-time dependencies that do not compile on iOS.
      #[cfg(all(debug_assertions, not(any(target_os = "ios", target_os = "android"))))]
      {
        _app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(target_os = "ios")]
      {
        use tauri::Manager;
        if let Some(window) = _app.get_webview_window("main") {
          window.with_webview(|webview| unsafe {
            use objc2::{msg_send, runtime::AnyObject};
            use objc2_core_foundation::CGRect;
            let view = webview.inner() as *mut AnyObject;
            let parent: *mut AnyObject = msg_send![view, superview];
            if !parent.is_null() {
              let bounds: CGRect = msg_send![parent, bounds];
              let _: () = msg_send![view, setFrame: bounds];
              let _: () = msg_send![view, setAutoresizingMask: 18usize];
            }
            let scroll: *mut AnyObject = msg_send![view, scrollView];
            // CSS viewport-fit and safe-area padding own the insets; UIKit must not add them again.
            let _: () = msg_send![scroll, setContentInsetAdjustmentBehavior: 2isize];
          })?;
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
