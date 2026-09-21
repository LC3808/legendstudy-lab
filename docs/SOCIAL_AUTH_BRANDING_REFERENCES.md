# Social Sign-In Branding References

**Status:** Production-verified for LAB web on 2026-09-21. These references guide brand presentation; provider configuration and authentication behavior are documented in [Shared Account Auth Setup](SHARED_ACCOUNT_AUTH_SETUP.md#production-auth-status-2026-09-21).

- Google requires Sign in with Google interfaces to follow its branding guidance and provides approved web button display patterns. [Google branding guidance](https://developers.google.com/identity/branding-guidelines)
- Apple documents Sign in with Apple button presentation and its Human Interface Guidelines. [Apple sign-in guidance](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- Kakao documents its login button symbol, label, container, and approved design resources. [Kakao login design guide](https://developers.kakao.com/docs/en/kakaologin/design-guide)

This repository exposes only providers listed in `NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS`. The variable is a visibility contract, not a credential or enablement mechanism. Current Production LAB UI exposes Google, Kakao, and Apple. Final UI polish may replace the Kakao raster icon with an SVG or higher-resolution official asset; this is not an auth release blocker. App-side social authentication remains unverified.
