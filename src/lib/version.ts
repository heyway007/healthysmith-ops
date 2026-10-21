import { version } from "../../package.json";

// The app version shown on every area (back office, front office, public
// pages, login). Bump "version" in package.json on each release; while it
// carries a pre-release tag ("0.1.0-beta") the UI also shows a BETA badge --
// drop the tag (e.g. "1.0.0") once the system is out of testing.
//
// Server-only by convention: import this from Server Components and pass the
// string down, so package.json isn't bundled into client JS.
export const APP_VERSION: string = version;
