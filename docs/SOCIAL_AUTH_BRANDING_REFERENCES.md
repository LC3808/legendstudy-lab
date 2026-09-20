# Social Sign-In Branding References

**Status:** Design reference only. A provider button must remain hidden unless that provider is configured and production-verified.

- Google requires Sign in with Google interfaces to follow its branding guidance and provides approved web button display patterns. [Google branding guidance](https://developers.google.com/identity/branding-guidelines)
- Apple documents Sign in with Apple button presentation and its Human Interface Guidelines. [Apple sign-in guidance](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- Kakao documents its login button symbol, label, container, and approved design resources. [Kakao login design guide](https://developers.kakao.com/docs/en/kakaologin/design-guide)

This repository exposes only providers listed in `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`. The variable is a visibility contract, not a credential or enablement mechanism. No social provider is shown when the configured list is empty.
