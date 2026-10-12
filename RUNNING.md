# Current project status

This project now runs independently on Next.js and Node.js. ChatGPT authentication, Sites publishing configuration, and Cloudflare storage have been removed from the active application.

Start with `npm run setup` and `npm run dev` from this directory. Open the printed localhost URL; the admin panel is `/admin`. Your local password is the `ADMIN_PASSWORD` value in ignored `.env.local`.

English/Persian, RTL, dark/light themes, the downloadable résumé, and editable content are retained. Content is saved in local SQLite at `data/resume.sqlite` and is ignored by Git.

See README.md for production and later GitHub instructions. No online deployment or DNS changes are part of this local setup.

Verification completed: production build and TypeScript checks passed. The running production server returned the public résumé and protected editor successfully. Password login, SQLite save/read-back, stale-revision rejection (409), anonymous/cross-origin rejection (403), and logout were tested successfully.

The admin panel now supports adding projects, named skills with four proficiency levels, work experience, education entries, and awards. Amber, Ocean, and Emerald palettes each support light/dark mode, with site defaults editable in the Themes tab. Public Persian text has been revised to a formal professional register, and Delaram Gallery links to https://delaram-gallery.com.

Verification: all added entry types and all six appearance combinations passed save/read-back checks; temporary test entries were removed afterward. The updated résumé and project link appeared in server-rendered public output. Browser interaction/visual checks were unavailable because no browser is connected.

Profile photo upload is available in Admin → Profile. JPG, PNG, and WebP files up to 5 MB are accepted. The image is previewed before publishing; click Save changes to display it on the résumé, or Remove photo and save to restore initials. Images are stored in the same SQLite database as the résumé.

Photo verification passed: authenticated upload, public image retrieval, saved avatar rendering, 512×512 WebP conversion without EXIF metadata, rejected invalid/oversized images, rejected anonymous/cross-origin uploads, missing-photo validation, and cache ETag handling. The temporary fixture was removed and the original profile was restored after testing. The production build and TypeScript checks passed.
