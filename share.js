/* =========================================================
   SHARE BUTTONS — one per hero/service-page section.
   Uses the native Web Share API where available (mobile browsers,
   most modern desktop browsers); falls back to copying the
   section's deep link to the clipboard otherwise. Fully
   independent of script.js and offerings-bg.js.
   ========================================================= */

(function () {
    const buttons = document.querySelectorAll('.share-btn');

    buttons.forEach((btn) => {
        const label = btn.querySelector('.share-label');

        btn.addEventListener('click', async () => {
            const title = btn.getAttribute('data-share-title') || document.title;
            const hash = btn.getAttribute('data-share-url') || '';
            const url = window.location.origin + window.location.pathname + hash;

            if (navigator.share) {
                try {
                    await navigator.share({ title, url });
                } catch (err) {
                    /* user cancelled the share sheet — no action needed */
                }
                return;
            }

            try {
                await navigator.clipboard.writeText(url);
                flash(btn, label, 'Link copied');
            } catch (err) {
                flash(btn, label, 'Copy failed');
            }
        });
    });

    function flash(btn, label, message) {
        if (!label) return;
        const original = label.textContent;
        label.textContent = message;
        btn.disabled = true;
        setTimeout(() => {
            label.textContent = original;
            btn.disabled = false;
        }, 1600);
    }
})();
