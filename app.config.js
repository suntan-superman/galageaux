export default {
  expo: {
    name: "Galageaux",
    slug: "galageaux",
    version: "1.0.0",
    orientation: "portrait",

    newArchEnabled: true,

    icon: "./assets/icons/notext_ios_1024.png",

    plugins: [
      "expo-secure-store"
    ],

    ios: {
      bundleIdentifier: "com.sjroy5.galageaux",
      supportsTablet: false,
      icon: "./assets/icons/notext_ios_1024.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },

    android: {
      package: "com.sjroy5.galageaux",
      adaptiveIcon: {
        foregroundImage: "./assets/icons/notext_android_adaptive_fg.png",
        backgroundImage: "./assets/icons/notext_android_adaptive_bg.png",
        backgroundColor: "#020617"
      }
    },

    web: {
      favicon: "./assets/favicon.png"
    },

    extra: {
      eas: {
        projectId: "b8ad8243-6b58-45d1-a61c-e22e65191733"
      }
    }
  }
};
