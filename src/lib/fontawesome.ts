import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Next.js handles CSS injection via the import above -- disable Font
// Awesome's own runtime <style> injection to avoid a flash of unstyled icons.
config.autoAddCss = false;
