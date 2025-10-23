export default function handler(req, res) {
    const evidenceCaptchaSiteKey = process.env.EVIDENCE_CAPTCHA_SITE_KEY || null;

    return res.status(200).json({
        evidenceCaptchaSiteKey
    });
}
