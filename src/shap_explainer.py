import logging

import numpy as np
import pandas as pd
import shap

logger = logging.getLogger(__name__)


class SHAPExplainer:
    def __init__(self, config: dict):
        self.config = config
        self.tier1_explainer = None
        self.tier2_explainer = None
        self.tier1_feature_order = None
        self.tier2_feature_order = None

    def load_tier1(self, model, feature_order, background_data=None):
        self.tier1_model = model
        self.tier1_feature_order = feature_order
        if background_data is not None:
            self.tier1_explainer = shap.TreeExplainer(model, background_data)
        else:
            self.tier1_explainer = shap.TreeExplainer(model)
        logger.info("SHAP explainer loaded for Tier-1")

    def load_tier2(self, model, feature_order, background_data=None):
        self.tier2_model = model
        self.tier2_feature_order = feature_order
        if background_data is not None:
            self.tier2_explainer = shap.TreeExplainer(model, background_data)
        else:
            self.tier2_explainer = shap.TreeExplainer(model)
        logger.info("SHAP explainer loaded for Tier-2")

    def explain_tier1(self, features: pd.DataFrame, top_n: int = 5) -> dict:
        if self.tier1_explainer is None:
            logger.warning("Tier-1 SHAP explainer not loaded")
            return {"top_features": [], "shap_values": []}

        if self.tier1_feature_order is not None:
            for col in self.tier1_feature_order:
                if col not in features.columns:
                    features[col] = 0
            features = features[self.tier1_feature_order]

        shap_values = self.tier1_explainer.shap_values(features)

        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]

        if len(shap_values.shape) == 1:
            shap_values = shap_values.reshape(1, -1)

        feature_names = list(features.columns)
        explanations = []

        for i in range(len(shap_values)):
            sv = shap_values[i]
            abs_sv = np.abs(sv)
            top_indices = np.argsort(abs_sv)[-top_n:][::-1]

            top_features = [
                {
                    "feature": feature_names[idx] if idx < len(feature_names) else f"feature_{idx}",
                    "importance": round(float(abs_sv[idx]), 4),
                    "direction": "positive" if sv[idx] > 0 else "negative",
                    "shap_value": round(float(sv[idx]), 4)
                }
                for idx in top_indices
            ]
            explanations.append({
                "top_features": top_features,
                "shap_values": {feature_names[j]: round(float(sv[j]), 4)
                                for j in range(len(sv))}
            })

        return explanations if len(explanations) > 1 else explanations[0]

    def explain_tier2(self, features: pd.DataFrame, top_n: int = 5) -> dict:
        if self.tier2_explainer is None:
            logger.warning("Tier-2 SHAP explainer not loaded")
            return {"top_features": [], "shap_values": []}

        if self.tier2_feature_order is not None:
            for col in self.tier2_feature_order:
                if col not in features.columns:
                    features[col] = 0
            features = features[self.tier2_feature_order]

        shap_values = self.tier2_explainer.shap_values(features)

        if isinstance(shap_values, list):
            if len(shap_values) > 1:
                max_class_idx = 1
                shap_values = shap_values[max_class_idx]
            else:
                shap_values = shap_values[0]

        if len(shap_values.shape) == 1:
            shap_values = shap_values.reshape(1, -1)

        feature_names = list(features.columns)
        explanations = []

        for i in range(len(shap_values)):
            sv = shap_values[i]
            abs_sv = np.abs(sv)
            top_indices = np.argsort(abs_sv)[-top_n:][::-1]

            top_features = [
                {
                    "feature": feature_names[idx] if idx < len(feature_names) else f"feature_{idx}",
                    "importance": round(float(abs_sv[idx]), 4),
                    "direction": "positive" if sv[idx] > 0 else "negative",
                    "shap_value": round(float(sv[idx]), 4)
                }
                for idx in top_indices
            ]
            explanations.append({
                "top_features": top_features,
                "shap_values": {feature_names[j]: round(float(sv[j]), 4)
                                for j in range(len(sv))}
            })

        return explanations if len(explanations) > 1 else explanations[0]