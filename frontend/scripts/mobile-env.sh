# Source from a macOS terminal before mobile builds. Keep other projects' tools unchanged.
export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/29.0.14206865"
export RUSTUP_TOOLCHAIN=1.94.1
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:/opt/homebrew/bin:$PATH"
