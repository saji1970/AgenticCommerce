# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.facebook.react.viewmanagers.RNCSafeAreaProviderManager { *; }
-keep class com.facebook.react.viewmanagers.RNCSafeAreaViewManager { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
