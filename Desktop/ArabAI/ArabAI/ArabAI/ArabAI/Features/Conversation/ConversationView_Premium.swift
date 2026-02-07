//
//  ConversationView_Premium.swift
//  ArabAI
//
//  Premium conversation UI with micro-interactions
//  Features: Animated gradient, glassmorphism, floating effects, particles
//

import SwiftUI

struct ConversationView_Premium: View {

    @StateObject private var viewModel: ConversationViewModel

    // MARK: - Initialization

    init(backendURL: String = "ws://192.168.1.166:8000") {
        _viewModel = StateObject(wrappedValue: ConversationViewModel(backendURL: backendURL))
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // Premium animated gradient background
            AnimatedGradientBackground()

            // Particle system
            ParticleView()
                .opacity(0.6)

            // Main content
            VStack(spacing: 30) {
                // Status indicator (premium style)
                StatusIndicator(
                    status: connectionStatus,
                    text: viewModel.connectionStatusArabic
                )
                .padding(.top, 20)
                .floating(delay: 0, duration: 4)

                // Activity status
                if !viewModel.activityStatusArabic.isEmpty {
                    Text(viewModel.activityStatusArabic)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(Color.white.opacity(0.1))
                        )
                        .floating(delay: 0.5, duration: 5)
                }

                Spacer()

                // App Title with gradient
                GradientText(
                    "ArabAI",
                    font: .system(size: 48, weight: .black, design: .rounded),
                    colors: [.premiumPurple, .premiumPink]
                )
                .shadow(color: .premiumPurple.opacity(0.5), radius: 20)
                .floating(delay: 1, duration: 6)

                Text("تعلم العربية مع الذكاء الاصطناعي")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                    .floating(delay: 1.5, duration: 5.5)

                // Premium Avatar (with floating effect)
                AvatarView_Premium(animator: viewModel.avatarAnimator)
                    .frame(height: 250)
                    .floating(delay: 2, duration: 7)

                // Status Message
                Text(viewModel.statusMessage)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .frame(height: 30)
                    .padding(.horizontal)

                // Conversation Display (premium bubbles)
                conversationDisplay
                    .frame(maxHeight: 200)

                Spacer()

                // Dialect Selector (glassmorphic)
                dialectSelector
                    .interactiveCard()
                    .padding(.horizontal, 30)

                // Learning Mode Toggle (glassmorphic)
                learningModeToggle
                    .interactiveCard()
                    .padding(.horizontal, 30)

                // Premium Start/Stop Button
                PremiumButton(
                    viewModel.isConversationActive ? "إيقاف المحادثة" : "بدء المحادثة",
                    icon: viewModel.isConversationActive ? "stop.circle.fill" : "mic.circle.fill",
                    color: viewModel.isConversationActive ? .red : .green,
                    action: viewModel.toggleConversation
                )
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }

            // Error overlay (premium style)
            if let errorMessage = viewModel.errorMessage {
                VStack {
                    Spacer()

                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 20))

                        Text(errorMessage)
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [Color.red.opacity(0.9), Color.red.opacity(0.7)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .shadow(color: .red.opacity(0.5), radius: 20)
                    )
                    .padding(.horizontal, 30)
                    .padding(.bottom, 130)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: viewModel.errorMessage)
    }

    // MARK: - Dialect Selector

    @ViewBuilder
    private var dialectSelector: some View {
        GlassmorphicCard {
            VStack(spacing: 12) {
                Text("اللهجة")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white.opacity(0.6))

                HStack(spacing: 12) {
                    ForEach(Dialect.allCases, id: \.self) { dialect in
                        Button(action: {
                            viewModel.changeDialect(dialect)
                        }) {
                            Text(dialect.displayName)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(viewModel.selectedDialect == dialect ? .white : .white.opacity(0.6))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(
                                            viewModel.selectedDialect == dialect ?
                                            LinearGradient(
                                                colors: [Color.blue.opacity(0.7), Color.purple.opacity(0.7)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            ) :
                                            LinearGradient(
                                                colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(
                                                    viewModel.selectedDialect == dialect ?
                                                    Color.white.opacity(0.3) :
                                                    Color.white.opacity(0.1),
                                                    lineWidth: 1
                                                )
                                        )
                                )
                        }
                        .disabled(!viewModel.isConversationActive)
                        .scaleEffect(viewModel.selectedDialect == dialect ? 1.05 : 1.0)
                        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: viewModel.selectedDialect)
                    }
                }
            }
            .padding(20)
        }
    }

    // MARK: - Learning Mode Toggle

    @ViewBuilder
    private var learningModeToggle: some View {
        GlassmorphicCard {
            HStack(spacing: 16) {
                Image(systemName: viewModel.learningModeEnabled ? "graduationcap.fill" : "graduationcap")
                    .font(.system(size: 24))
                    .foregroundColor(viewModel.learningModeEnabled ? .green : .white.opacity(0.5))
                    .scaleEffect(viewModel.learningModeEnabled ? 1.1 : 1.0)
                    .animation(.spring(response: 0.4, dampingFraction: 0.6), value: viewModel.learningModeEnabled)

                VStack(alignment: .leading, spacing: 4) {
                    Text("وضع التعلم")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)

                    Text("تحسينات تربوية مخصصة")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.6))
                }

                Spacer()

                Toggle("", isOn: $viewModel.learningModeEnabled)
                    .labelsHidden()
                    .tint(.green)
            }
            .padding(20)
        }
    }

    // MARK: - Conversation Display

    @ViewBuilder
    private var conversationDisplay: some View {
        ScrollView {
            VStack(spacing: 20) {
                // User message
                if !viewModel.lastUserMessage.isEmpty {
                    MessageBubble(
                        text: viewModel.lastUserMessage,
                        isUser: true
                    )
                }

                // AI message
                if !viewModel.lastAIMessage.isEmpty {
                    MessageBubble(
                        text: viewModel.lastAIMessage,
                        isUser: false
                    )
                }
            }
            .padding(.horizontal, 24)
        }
    }

    // MARK: - Helpers

    private var connectionStatus: StatusIndicator.ConnectionStatus {
        switch viewModel.webSocketClient.connectionState {
        case .connected:
            return .connected
        case .connecting, .reconnecting:
            return .connecting
        case .disconnected:
            return .disconnected
        }
    }
}

// MARK: - Preview

struct ConversationView_Premium_Previews: PreviewProvider {
    static var previews: some View {
        ConversationView_Premium()
    }
}
