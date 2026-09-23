# Device, accessibility, editorial, and infrastructure record

Status vocabulary is PASS, FAIL, or NOT RUN. Automated emulation is not relabelled as physical-device or human evidence.

| Check | Status | Evidence / limitation |
|---|---|---|
| Mobile web 320 px | PASS | Installed Google Chrome, production export, Playwright E07; screenshot 'evidence/final-feedback-mobile-320.png'. |
| Mobile web 390 px | PASS | Installed Google Chrome, production export, full E01–E06 behavior plus E07; screenshot 'evidence/final-feedback-mobile-390.png'. |
| Mobile web 430 px | PASS | Installed Google Chrome, production export, Playwright E07; screenshot 'evidence/final-feedback-mobile-430.png'. |
| Desktop browser | NOT RUN | Skipped by explicit user direction on 2026-09-22 because this is a mobile-first website. |
| Tablet browser | NOT RUN | Not included in the user-directed mobile viewport scope. |
| Android/iOS physical lifecycle | NOT RUN | No physical device session was performed. Android Back has component-level coverage only. |
| TalkBack / VoiceOver | NOT RUN | No assistive-technology device session was performed. |
| 200% text and landscape on device | NOT RUN | Requires supported target-device evidence. |
| Keyboard entry and semantic selection | PASS | Chrome E02/E03 exercises text entry and exposes radio checked state; full manual Tab-order review is NOT RUN. |
| Human editorial review | NOT RUN | Automated independent oracles and quarantines are recorded, but no human editor signed off the released bank. |
| Human timing calibration | NOT RUN | Every family remains 'provisional'; no target-audience timing study was performed. |
| External dataset rights review | NOT RUN | No external dataset was imported. See original-content-rights.md. |
| Production hosting/update rollout | NOT RUN | Offline/cache behavior passed locally against a production export; no deployed infrastructure was changed. |
| Dependency security remediation | NOT RUN | Install reported 25 advisories (1 low, 11 moderate, 12 high, 1 critical). No automatic or breaking audit fix was authorized. |
