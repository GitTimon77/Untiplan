import SwiftUI

@main
struct UntiplanApp: App {
    @StateObject private var webViewState = WebViewState()

    var body: some Scene {
        WindowGroup {
            ContentView(state: webViewState)
        }
    }
}

private struct ContentView: View {
    @ObservedObject var state: WebViewState

    var body: some View {
        ZStack {
            WebView(state: state)

            if state.isLoading {
                ProgressView()
                    .padding(18)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
            }

            if state.hasConnectionError {
                VStack(spacing: 14) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.accentColor)

                    Text("Untiplan ist nicht erreichbar")
                        .font(.headline)

                    Text("Prüfe deine Internetverbindung und versuche es erneut.")
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)

                    Button("Erneut versuchen") {
                        state.reload()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(24)
                .frame(maxWidth: 360)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
                .padding()
            }
        }
    }
}
