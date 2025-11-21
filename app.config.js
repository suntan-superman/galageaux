export default {
  expo: {
    name: "Galageaux",
    slug: "galageaux",
    version: "1.0.0",
    orientation: "portrait",

    newArchEnabled: true,

    icon: "./assets/icon.png",

    splash: {
      image: "./assets/splash.png",        // optional – you can replace with your own
      resizeMode: "contain",
      backgroundColor: "#020617"
    },

    ios: {
      bundleIdentifier: "com.sjroy5.galageaux",
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },

    android: {
      package: "com.sjroy5.galageaux",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
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
