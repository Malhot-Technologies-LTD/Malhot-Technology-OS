import "server-only";

import { cache } from "react";

/**
 * The instant a request's figures are computed against, read once per request.
 *
 * Every "overdue", "days left" and "this week" on a page must agree with every
 * other one, including across the layout and the page, which render
 * separately. Reading the clock in each component would let two of them
 * straddle a minute or a midnight; one memoised read per request cannot.
 */
export const requestTime = cache((): number => Date.now());
