//
//  ConversationView.swift
//  ArabAI
//
//  Main conversation UI with avatar and start/stop control
//

import SwiftUI

struct ConversationView: View {

    @StateObject private var viewModel: ConversationViewModel

    // MARK: - Initialization

    init(backendURL: String = "ws://localhost:8000") {
        _viewModel = StateObject(wrappedValue: ConversationViewModel(backendURL: backendURL))
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // 🎨 FOND TRANSPARENT pour voir le gradient premium derrière
            Color.clear
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Status indicator
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)

                    Text(viewModel.connectionStatusArabic)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if !viewModel.activityStatusArabic.isEmpty {
                        Text("•")
                            .foregroundColor(.secondary)

                        Text(viewModel.activityStatusArabic)
                            .font(.caption)
                            .foregroundColor(.primary)
                    }
                }
                .padding(.top, 20)

                Spacer()
                    .frame(height: 20)

                // Dialect Selector - Dropdown
                HStack(spacing: 12) {
                    Image(systemName: "globe")
                        .foregroundColor(.white.opacity(0.7))
                        .font(.system(size: 16))

                    Text("اللهجة:")  // "Dialect:"
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Picker("", selection: $viewModel.selectedDialect) {
                        ForEach(Dialect.allCases, id: \.self) { dialect in
                            Text(dialect.displayName)
                                .tag(dialect)
                        }
                    }
                    .pickerStyle(.menu)
                    .accentColor(.white)
                    .disabled(viewModel.isConversationActive)
                    .onChange(of: viewModel.selectedDialect) { newDialect in
                        viewModel.changeDialect(newDialect)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.1))
                )
                .padding(.horizontal, 40)
                .opacity(viewModel.isConversationActive ? 0.5 : 1.0)

                // Learning Mode Toggle
                HStack {
                    Image(systemName: viewModel.learningModeEnabled ? "graduationcap.fill" : "graduationcap")
                        .foregroundColor(viewModel.learningModeEnabled ? .green : .gray)

                    Text("وضع التعلم")  // "Learning Mode"
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))

                    Toggle("", isOn: $viewModel.learningModeEnabled)
                        .labelsHidden()
                        .tint(.green)
                        .disabled(viewModel.isConversationActive)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.1))
                )
                .padding(.horizontal, 40)
                .padding(.top, 16)
                .opacity(viewModel.isConversationActive ? 0.5 : 1.0)

                Spacer()

                // App Title
                Text("ArabAI")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                // Avatar
                AvatarView(animator: viewModel.avatarAnimator)
                    .padding(.vertical, 20)

                // Status Message
                Text(viewModel.statusMessage)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .frame(minHeight: 50)

                Spacer()

                // Start/Stop Button
                Button(action: viewModel.toggleConversation) {
                    HStack(spacing: 12) {
                        Image(systemName: viewModel.isConversationActive ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 24))

                        Text(viewModel.isConversationActive ? "إيقاف المحادثة" : "بدء المحادثة")
                            .font(.system(size: 20, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(viewModel.isConversationActive ? Color.red : Color.green)
                    )
                    .shadow(
                        color: (viewModel.isConversationActive ? Color.red : Color.green).opacity(0.4),
                        radius: 12,
                        x: 0,
                        y: 6
                    )
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }

            // Error overlay
            if let errorMessage = viewModel.errorMessage {
                VStack {
                    Spacer()

                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text(errorMessage)
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.white)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.red.opacity(0.9))
                    )
                    .padding(.horizontal)
                    .padding(.bottom, 120)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut, value: viewModel.errorMessage)
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch viewModel.webSocketClient.connectionState {
        case .connected:
            return .green
        case .connecting, .reconnecting:
            return .orange
        case .disconnected:
            return .red
        }
    }
}

// MARK: - Preview

struct ConversationView_Previews: PreviewProvider {
    static var previews: some View {
        ConversationView()
    }
}
