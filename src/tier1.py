import logging
import os

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class Tier1Classifier:
    def __init__(self, config: dict):
        self.config = config
        tier1_cfg = config.get("tier1", {})
        self.lgbm_threshold = tier1_cfg.get("lgbm_threshold", 0.30)
        self.lgbm_model = None
        self.iforest_model = None
        self.preprocessor = None
        self.feature_order = None
        self.lgbm_path = tier1_cfg.get("model_path", "models/tier1_lgbm.joblib")
        self.iforest_path = tier1_cfg.get("iforest_path", "models/tier1_iforest.joblib")
        self.preprocessor_path = tier1_cfg.get("preprocessor_path", "models/tier1_preprocessor.joblib")
        self.feature_order_path = tier1_cfg.get("feature_order_path", "models/tier1_feature_order.joblib")

    def load(self, model_dir: str = None):
        base = model_dir or "models"
        self.lgbm_model = joblib.load(os.path.join(base, os.path.basename(self.lgbm_path)))
        self.iforest_model = joblib.load(os.path.join(base, os.path.basename(self.iforest_path)))
        self.preprocessor = joblib.load(os.path.join(base, os.path.basename(self.preprocessor_path)))
        self.feature_order = joblib.load(os.path.join(base, os.path.basename(self.feature_order_path)))
        logger.info("Tier-1 models loaded from %s", base)

    def _preprocess(self, features: pd.DataFrame) -> np.ndarray:
        if self.feature_order is not None:
            for col in self.feature_order:
                if col not in features.columns:
                    features[col] = 0
            features = features[self.feature_order]

        if self.preprocessor is not None:
            X = self.preprocessor.transform(features)
        else:
            X = features.values

        return X

    def predict(self, features: pd.DataFrame) -> dict:
        if features.empty:
            return {"status": "benign", "probability": 0.0}

        X = self._preprocess(features)

        lgbm_proba = self.lgbm_model.predict_proba(X)
        anomaly_proba = lgbm_proba[:, 1] if lgbm_proba.shape[1] > 1 else lgbm_proba[:, 0]

        iforest_pred = self.iforest_model.predict(X)
        iforest_anomaly = (iforest_pred == -1)

        results = []
        for i in range(len(X)):
            lgbm_score = float(anomaly_proba[i])
            if_anomaly = bool(iforest_anomaly[i])

            if lgbm_score > self.lgbm_threshold or if_anomaly:
                status = "anomaly"
                prob = max(lgbm_score, 0.5 if if_anomaly else lgbm_score)
            else:
                status = "benign"
                prob = 1.0 - lgbm_score

            results.append({
                "status": status,
                "probability": round(prob, 4)
            })

        return results if len(results) > 1 else results[0]

    def predict_batch(self, features: pd.DataFrame) -> list:
        if features.empty:
            return [{"status": "benign", "probability": 0.0}]
        X = self._preprocess(features)

        lgbm_proba = self.lgbm_model.predict_proba(X)
        anomaly_proba = lgbm_proba[:, 1] if lgbm_proba.shape[1] > 1 else lgbm_proba[:, 0]

        iforest_pred = self.iforest_model.predict(X)
        iforest_anomaly = (iforest_pred == -1)

        results = []
        for i in range(len(X)):
            lgbm_score = float(anomaly_proba[i])
            if_anomaly = bool(iforest_anomaly[i])

            if lgbm_score > self.lgbm_threshold or if_anomaly:
                status = "anomaly"
                prob = max(lgbm_score, 0.5 if if_anomaly else lgbm_score)
            else:
                status = "benign"
                prob = 1.0 - lgbm_score

            results.append({
                "status": status,
                "probability": round(prob, 4)
            })

        return results