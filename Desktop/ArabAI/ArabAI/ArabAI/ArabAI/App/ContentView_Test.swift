//
//  ContentView_Test.swift
//  ArabAI
//
//  Test pour diagnostiquer le problème de design
//

import SwiftUI

struct ContentView_Test: View {
    var body: some View {
        ZStack {
            // Test 1: Animated Gradient Background
            AnimatedGradientBackground()

            VStack {
                Text("🎨 DESIGN PREMIUM TEST")
                    .font(.largeTitle)
                    .foregroundColor(.white)

                Text("Si tu vois ce texte avec un gradient animé,")
                    .foregroundColor(.white)

                Text("les composants premium fonctionnent !")
                    .foregroundColor(.white)
                    .padding()
            }
        }
    }
}

struct ContentView_Test_Previews: PreviewProvider {
    static var previews: some View {
        ContentView_Test()
    }
}
