import Combine
import SwiftUI
import UIKit
import WebKit

@MainActor
final class WebViewState: ObservableObject {
    static let startURL = URL(string: "https://untiplan.timonring.dev")!

    @Published var isLoading = true
    @Published var hasConnectionError = false

    weak var webView: WKWebView?

    func reload() {
        isLoading = true
        hasConnectionError = false

        if let webView {
            webView.load(URLRequest(url: Self.startURL))
        }
    }
}

struct WebView: UIViewRepresentable {
    let state: WebViewState

    func makeCoordinator() -> Coordinator {
        Coordinator(state: state)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.refresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl

        state.webView = webView
        webView.load(URLRequest(url: WebViewState.startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let state: WebViewState
        private let allowedHost = "untiplan.timonring.dev"

        init(state: WebViewState) {
            self.state = state
        }

        @objc func refresh(_ sender: UIRefreshControl) {
            state.webView?.reload()
            sender.endRefreshing()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            let isWebLink = url.scheme == "https" || url.scheme == "http"
            let isWebContent = url.scheme == "blob" || url.scheme == "data" || url.scheme == "about"
            if isWebLink {
                if url.host == allowedHost {
                    decisionHandler(.allow)
                } else {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                }
            } else if isWebContent {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil,
               let url = navigationAction.request.url {
                if url.host == allowedHost {
                    webView.load(URLRequest(url: url))
                } else {
                    UIApplication.shared.open(url)
                }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation?) {
            state.isLoading = true
            state.hasConnectionError = false
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation?) {
            state.isLoading = false
            state.hasConnectionError = false
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation?,
            withError error: Error
        ) {
            let errorCode = (error as NSError).code
            guard errorCode != NSURLErrorCancelled else { return }

            state.isLoading = false
            state.hasConnectionError = true
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }
}
