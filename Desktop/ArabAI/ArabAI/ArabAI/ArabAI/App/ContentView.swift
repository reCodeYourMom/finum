//
//  ContentView.swift
//  ArabAI
//
//  Main content view with premium design
//

import SwiftUI

struct ContentView: View {
    @State private var animateGradient = false

    var body: some View {
        ZStack {
            // 🧪 TEST SIMPLE - Gradient animé sans dépendances
            LinearGradient(
                colors: [
                    Color.purple,
                    Color.blue,
                    Color.pink,
                    Color.orange
                ],
                startPoint: animateGradient ? .topLeading : .bottomLeading,
                endPoint: animateGradient ? .bottomTrailing : .topTrailing
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
                    animateGradient.toggle()
                }
            }

            VStack(spacing: 20) {
                Text("🎨 TEST DESIGN PREMIUM")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)

                Text("Si tu vois ce gradient animé")
                    .foregroundColor(.white)

                Text("qui change lentement,")
                    .foregroundColor(.white)

                Text("ContentView fonctionne !")
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(12)
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
