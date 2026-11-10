Pod::Spec.new do |s|
  s.name           = 'VannaDynamic'
  s.version        = '0.1.0'
  s.summary        = 'Dynamic embedded wallets (Solana + Stellar) for Vanna'
  s.description    = 'Local Expo module wrapping the Dynamic Swift SDK.'
  s.author         = 'Vanna'
  s.homepage       = 'https://vanna.finance'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/vanna-finance/vanna-mobile.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Dynamic Swift SDK is a Swift package (binary xcframeworks). React Native's CocoaPods helper
  # attaches it to this pod. UNVERIFIED: not built yet (needs a Mac + Apple developer account).
  spm_dependency(s,
    url: 'https://github.com/dynamic-labs-oss/swift-sdk-and-sample-app.git',
    requirement: { kind: 'upToNextMajorVersion', minimumVersion: '1.9.0' },
    products: ['DynamicSDKSwift']
  )

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = "**/*.{h,m,swift}"
end
