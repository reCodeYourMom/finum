//
//  PremiumDesignSystem.swift
//  ArabAI
//
//  Premium design system with micro-interactions
//  Inspired by the landing page design
//

import SwiftUI

// MARK: - Animated Gradient Background

struct AnimatedGradientBackground: View {
    @State private var animateGradient = false

    var body: some View {
        LinearGradient(
            colors: [
                Color(red: 0.06, green: 0.09, blue: 0.16),  // #0f172a
                Color(red: 0.12, green: 0.11, blue: 0.29),  // #1e1b4b
                Color(red: 0.19, green: 0.18, blue: 0.51),  // #312e81
                Color(red: 0.12, green: 0.23, blue: 0.54)   // #1e3a8a
            ],
            startPoint: animateGradient ? .topLeading : .bottomLeading,
            endPoint: animateGradient ? .bottomTrailing : .topTrailing
        )
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 15).repeatForever(autoreverses: true)) {
                animateGradient.toggle()
            }
        }
    }
}

// MARK: - Glassmorphism Effect

struct GlassmorphicCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.05))
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(.ultraThinMaterial)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
    }
}

// MARK: - Floating Animation

struct FloatingModifier: ViewModifier {
    @State private var isFloating = false
    let delay: Double
    let duration: Double

    func body(content: Content) -> some View {
        content
            .offset(y: isFloating ? -20 : 0)
            .onAppear {
                withAnimation(
                    .easeInOut(duration: duration)
                    .repeatForever(autoreverses: true)
                    .delay(delay)
                ) {
                    isFloating.toggle()
                }
            }
    }
}

extension View {
    func floating(delay: Double = 0, duration: Double = 6) -> some View {
        modifier(FloatingModifier(delay: delay, duration: duration))
    }
}

// MARK: - Pulse Glow Effect

struct PulseGlowModifier: ViewModifier {
    @State private var isPulsing = false
    let color: Color

    func body(content: Content) -> some View {
        content
            .shadow(
                color: color.opacity(isPulsing ? 0.6 : 0.3),
                radius: isPulsing ? 40 : 20,
                x: 0,
                y: 0
            )
            .onAppear {
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    isPulsing.toggle()
                }
            }
    }
}

extension View {
    func pulseGlow(color: Color = .purple) -> some View {
        modifier(PulseGlowModifier(color: color))
    }
}

// MARK: - Card Hover Effect (Press in SwiftUI)

struct InteractiveCardModifier: ViewModifier {
    @State private var isPressed = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? 1.05 : 1.0)
            .offset(y: isPressed ? -10 : 0)
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        isPressed = true
                    }
                    .onEnded { _ in
                        isPressed = false
                    }
            )
    }
}

extension View {
    func interactiveCard() -> some View {
        modifier(InteractiveCardModifier())
    }
}

// MARK: - Gradient Text

struct GradientText: View {
    let text: String
    let font: Font
    let colors: [Color]

    init(
        _ text: String,
        font: Font = .title,
        colors: [Color] = [Color(red: 0.4, green: 0.49, blue: 0.92), Color(red: 0.46, green: 0.29, blue: 0.64)]
    ) {
        self.text = text
        self.font = font
        self.colors = colors
    }

    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(
                LinearGradient(
                    colors: colors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
    }
}

// MARK: - Premium Button with Shine Effect

struct PremiumButton: View {
    let title: String
    let icon: String?
    let color: Color
    let action: () -> Void

    @State private var isShining = false

    init(
        _ title: String,
        icon: String? = nil,
        color: Color = .blue,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.color = color
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                }

                Text(title)
                    .font(.system(size: 20, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                ZStack {
                    // Base gradient
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [color, color.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    // Shine effect
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.clear,
                                    Color.white.opacity(isShining ? 0.3 : 0),
                                    Color.clear
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .offset(x: isShining ? 400 : -400)
                }
            )
            .shadow(color: color.opacity(0.5), radius: 20, x: 0, y: 10)
            .pulseGlow(color: color)
        }
        .buttonStyle(ScaleButtonStyle())
        .onAppear {
            // Trigger shine animation periodically
            Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
                withAnimation(.easeInOut(duration: 1)) {
                    isShining = true
                }

                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    isShining = false
                }
            }
        }
    }
}

// MARK: - Scale Button Style

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Particle System

struct ParticleView: View {
    @State private var particles: [Particle] = []

    struct Particle: Identifiable {
        let id = UUID()
        var x: CGFloat
        var y: CGFloat
        var opacity: Double
        var scale: CGFloat
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(particles) { particle in
                    Circle()
                        .fill(Color.purple.opacity(particle.opacity))
                        .frame(width: 3, height: 3)
                        .scaleEffect(particle.scale)
                        .position(x: particle.x, y: particle.y)
                        .blur(radius: 1)
                }
            }
            .onAppear {
                startParticleSystem(in: geometry.size)
            }
        }
    }

    private func startParticleSystem(in size: CGSize) {
        // Generate initial particles
        for _ in 0..<30 {
            let particle = Particle(
                x: CGFloat.random(in: 0...size.width),
                y: CGFloat.random(in: 0...size.height),
                opacity: Double.random(in: 0.1...0.4),
                scale: CGFloat.random(in: 0.5...1.5)
            )
            particles.append(particle)
        }

        // Animate particles
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            withAnimation(.linear(duration: 0.1)) {
                for i in 0..<particles.count {
                    particles[i].y -= 0.5

                    // Reset particle when it reaches top
                    if particles[i].y < 0 {
                        particles[i].y = size.height
                        particles[i].x = CGFloat.random(in: 0...size.width)
                        particles[i].opacity = Double.random(in: 0.1...0.4)
                    }
                }
            }
        }
    }
}

// MARK: - Status Indicator with Pulse

struct StatusIndicator: View {
    let status: ConnectionStatus
    let text: String

    enum ConnectionStatus {
        case connected, connecting, disconnected

        var color: Color {
            switch self {
            case .connected: return .green
            case .connecting: return .orange
            case .disconnected: return .red
            }
        }
    }

    @State private var isPulsing = false

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(status.color)
                .frame(width: 12, height: 12)
                .scaleEffect(isPulsing ? 1.2 : 1.0)
                .opacity(isPulsing ? 0.7 : 1.0)
                .animation(.easeInOut(duration: 1).repeatForever(autoreverses: true), value: isPulsing)

            Text(text)
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.1))
                .overlay(
                    Capsule()
                        .stroke(status.color.opacity(0.3), lineWidth: 1)
                )
        )
        .onAppear {
            isPulsing = true
        }
    }
}

// MARK: - Message Bubble with Slide-in Animation

struct MessageBubble: View {
    let text: String
    let isUser: Bool

    @State private var appeared = false

    var body: some View {
        HStack {
            if isUser { Spacer() }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(isUser ? "أنت" : "ArabAI")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))

                Text(text)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: isUser ?
                                        [Color.blue.opacity(0.5), Color.blue.opacity(0.3)] :
                                        [Color.green.opacity(0.5), Color.green.opacity(0.3)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .shadow(
                                color: (isUser ? Color.blue : Color.green).opacity(0.3),
                                radius: 8,
                                x: 0,
                                y: 4
                            )
                    )
            }
            .frame(maxWidth: 250, alignment: isUser ? .trailing : .leading)
            .offset(x: appeared ? 0 : (isUser ? 50 : -50))
            .opacity(appeared ? 1 : 0)

            if !isUser { Spacer() }
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                appeared = true
            }
        }
    }
}

// MARK: - Premium Colors

extension Color {
    static let premiumPurple = Color(red: 0.4, green: 0.49, blue: 0.92)
    static let premiumPink = Color(red: 0.94, green: 0.34, blue: 0.42)
    static let premiumBlue = Color(red: 0.12, green: 0.23, blue: 0.54)
    static let premiumIndigo = Color(red: 0.19, green: 0.18, blue: 0.51)
}
