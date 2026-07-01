# Headless no-overflow / fidelity testing convention (mobile)

A standing convention every mobile project must follow in its `make test` suite. It exists because
`tester.takeException()` only catches **hard `RenderFlex` exceptions** — and the two defects that hurt
most on a real device throw nothing:

- a **scrollable** `GridView`/`ListView` with no bottom padding **clips** at the viewport edge instead
  of overflowing (no exception);
- a **doubled status bar** — the app draws its own status bar inside `SafeArea` while the OS status bar
  is also present — is just an overlap (no exception).

The live simulator render (`mobile-render.md`) is the backstop, but these are cheap to catch
**headlessly** first, in `make test`, if the tests are set up like the device. Two rules do it: **pump
at the real device size with the OS inset**, and **assert beyond `takeException()`**.

## 1. Pump at the real `device_logical_size`, with the OS top inset

Stop pumping at the implicit `1280×800`. Use the **landscape logical size** recorded in
`project.config.md → device_logical_size` (measured once on-device), and inject the OS top inset via
`MediaQuery.padding.top` so `SafeArea` consumes the same space it does on the device — this is what
surfaces the **double-chrome overlap** headlessly (without the inset, `SafeArea` is a no-op and the
overlap never reproduces).

```dart
// test/support/device_sizes.dart  (shared helper — one source of truth)
class DeviceProfile {
  const DeviceProfile(this.logicalSize, this.topInset);
  final Size logicalSize;     // from project.config.md device_logical_size (landscape, dp)
  final double topInset;      // measured OS status-bar height (MediaQuery.padding.top), e.g. 24
}

const iPadLandscape = DeviceProfile(Size(1366, 1024), 24); // MEASURE; don't hard-code blindly

extension PumpAtDevice on WidgetTester {
  Future<void> pumpAtDevice(Widget child, DeviceProfile d) async {
    view.physicalSize = d.logicalSize * view.devicePixelRatio;
    view.devicePixelRatio = view.devicePixelRatio;
    addTearDown(view.resetPhysicalSize);
    await pumpWidget(MediaQuery(
      data: MediaQueryData(
        size: d.logicalSize,
        padding: EdgeInsets.only(top: d.topInset), // OS status-bar inset → SafeArea behaves like device
      ),
      child: child,
    ));
  }
}
```

## 2. Assert beyond `takeException()`

Every no-overflow/fidelity test asserts all of these (helpers in `test/support/layout_checks.dart`):

- **Scrollables reach their last item.** `scrollUntilVisible` the final element; assert it's actually
  visible (not stuck off-screen). A grid that can't reveal its last row is clipped.
- **Lists/grids have non-zero bottom padding** — the last row/item is **not flush to (or under) the
  viewport edge**. Assert the last item's bottom is strictly above the viewport bottom by the expected
  padding, so a future `padding: EdgeInsets.only(bottom: …)` regression is caught.
- **No key content at/under the viewport edge.** For each spec'd key widget, assert its rect is fully
  inside the `device_logical_size` viewport (top edge below the status-bar inset, bottom edge above the
  screen bottom).
- **Exactly one app status bar renders.** Assert `find.byType(StatusBar)` (or your app bar's status
  widget) returns **count 1** when the OS inset is present — two means the doubled-chrome regression.

```dart
testWidgets('menu grid is not clipped at the bottom on iPad', (tester) async {
  await tester.pumpAtDevice(const TableMenuScreen(), iPadLandscape);
  await tester.scrollToLastItem(find.byType(MenuCard));        // reaches the end
  expectLastItemNotFlushToEdge(tester, find.byType(MenuCard)); // non-zero bottom padding
  expectExactlyOneStatusBar(tester);                            // no doubled chrome
  expect(tester.takeException(), isNull);                       // still assert no hard overflow
});
```

## How this plugs into the loop

- `make test` is a **mobile automated gate** (`pass-matrix.md → Automated gates`) — a red test fails the
  round before the QA panel runs. These assertions turn the silent-clip class into a red gate.
- The live simulator render (`mobile-render.md`) still runs as the QA-panel render gate — it catches
  whatever the headless tests can't model (real OS chrome, fonts, asset scaling).
- `device_logical_size` is the single shared input to both, so the headless size and the rendered size
  match.
