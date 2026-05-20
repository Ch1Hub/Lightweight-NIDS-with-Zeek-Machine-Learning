import logging

logger = logging.getLogger(__name__)


class UnknownDetector:
    def __init__(self, config: dict):
        self.config = config
        tier2_cfg = config.get("tier2", {})
        self.unknown_threshold = tier2_cfg.get("unknown_threshold", 0.65)

    def detect(self, tier2_result: dict) -> dict:
        confidence = tier2_result.get("confidence", 0.0)
        predicted_attack = tier2_result.get("attack", "Unknown")

        is_unknown = confidence < self.unknown_threshold or predicted_attack == "Unknown"

        result = {
            "is_unknown": is_unknown,
            "attack": "Unknown" if is_unknown else predicted_attack,
            "confidence": confidence,
            "reason": ""
        }

        if is_unknown:
            if confidence < self.unknown_threshold:
                result["reason"] = f"Low confidence ({confidence:.2f} < {self.unknown_threshold})"
            else:
                result["reason"] = "Explicitly classified as Unknown"

        logger.debug(
            "Unknown detection: attack=%s, confidence=%.2f, is_unknown=%s",
            result["attack"], confidence, is_unknown
        )

        return result

    def detect_batch(self, tier2_results: list) -> list:
        return [self.detect(r) for r in tier2_results]