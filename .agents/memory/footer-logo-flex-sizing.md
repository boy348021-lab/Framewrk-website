---
name: Footer logo flex sizing
description: Prevent intrinsic image sizing from starving footer navigation.
---

A wide intrinsic logo inside an auto-sized flex item can expand the item to its max-content width and collapse the adjacent links grid, even when the links use `flex: 1`.

**Why:** The footer wordmark's width-constrained inner frame still contributed its intrinsic image width during flex sizing, leaving the navigation with almost no available width.

**How to apply:** In horizontal footer layouts, give the brand block an explicit width and flex basis. Add desktop child-column width checks alongside mobile overflow checks.