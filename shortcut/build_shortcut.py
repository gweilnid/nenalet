"""Vytvoří zkratku „Nenaleť“ pro iPhone/Mac (.shortcut) a podepíše ji nástrojem `shortcuts sign`.

Použití:  python3 build_shortcut.py https://nenalet.example.cz

Zkratka se zobrazí v nabídce Sdílet (text, odkaz, stránka v Safari, snímek obrazovky).
Spuštěná bez vstupu (z plochy nebo widgetu) vezme obsah schránky.
"""

from __future__ import annotations

import plistlib
import subprocess
import sys
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _uuid() -> str:
    return str(uuid.uuid4()).upper()


EXTENSION_INPUT = {"Value": {"Type": "ExtensionInput"}, "WFSerializationType": "WFTextTokenAttachment"}


def output_ref(uid: str, name: str) -> dict:
    return {"Value": {"Type": "ActionOutput", "OutputUUID": uid, "OutputName": name}, "WFSerializationType": "WFTextTokenAttachment"}


def text_with(uid: str, name: str) -> dict:
    """Textové pole obsahující jen proměnnou (výstup akce)."""
    return {
        "Value": {
            "string": "￼",
            "attachmentsByRange": {"{0, 1}": {"Type": "ActionOutput", "OutputUUID": uid, "OutputName": name}},
        },
        "WFSerializationType": "WFTextTokenString",
    }


def plain(s: str) -> dict:
    return {"Value": {"string": s}, "WFSerializationType": "WFTextTokenString"}


def build(api_base: str) -> dict:
    u_img, u_b64, u_urls, u_text, u_req = (_uuid() for _ in range(5))
    endpoint = api_base.rstrip("/") + "/api/check?format=text"
    actions = [
        {"WFWorkflowActionIdentifier": "is.workflow.actions.comment",
         "WFWorkflowActionParameters": {"WFCommentActionText": "Nenaleť – ověří podezřelou zprávu, odkaz nebo snímek obrazovky. Obsah se neukládá."}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.detect.images",
         "WFWorkflowActionParameters": {"UUID": u_img, "WFInput": EXTENSION_INPUT}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.base64encode",
         "WFWorkflowActionParameters": {"UUID": u_b64, "WFInput": output_ref(u_img, "Images"),
                                         "WFEncodeMode": "Encode", "WFBase64LineBreakMode": "None"}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.detect.link",
         "WFWorkflowActionParameters": {"UUID": u_urls, "WFInput": EXTENSION_INPUT}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.detect.text",
         "WFWorkflowActionParameters": {"UUID": u_text, "WFInput": EXTENSION_INPUT}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
         "WFWorkflowActionParameters": {
             "UUID": u_req,
             "WFURL": endpoint,
             "WFHTTPMethod": "POST",
             "WFHTTPBodyType": "JSON",
             "ShowHeaders": False,
             "WFJSONValues": {
                 "Value": {"WFDictionaryFieldValueItems": [
                     {"WFItemType": 0, "WFKey": plain("text"), "WFValue": text_with(u_text, "Text")},
                     {"WFItemType": 0, "WFKey": plain("url"), "WFValue": text_with(u_urls, "URLs")},
                     {"WFItemType": 0, "WFKey": plain("image_base64"), "WFValue": text_with(u_b64, "Base64 Encoded")},
                     {"WFItemType": 0, "WFKey": plain("client"), "WFValue": plain("shortcut")},
                 ]},
                 "WFSerializationType": "WFDictionaryFieldValue",
             },
         }},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.showresult",
         "WFWorkflowActionParameters": {"Text": text_with(u_req, "Contents of URL")}},
    ]
    return {
        "WFWorkflowClientVersion": "2607.0.2",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 463140863, "WFWorkflowIconGlyphNumber": 59511},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowTypes": ["ActionExtension"],
        "WFWorkflowInputContentItemClasses": [
            "WFStringContentItem", "WFRichTextContentItem", "WFURLContentItem",
            "WFSafariWebPageContentItem", "WFImageContentItem", "WFArticleContentItem",
        ],
        "WFWorkflowNoInputBehavior": {"Name": "WFWorkflowNoInputBehaviorGetClipboard", "Parameters": {}},
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowHasOutputFallback": False,
        "WFQuickActionSurfaces": [],
        "WFWorkflowActions": actions,
    }


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    api_base = sys.argv[1]
    unsigned = HERE / "Nenalet-unsigned.shortcut"
    signed = HERE / "Nenalet.shortcut"
    with unsigned.open("wb") as f:
        plistlib.dump(build(api_base), f, fmt=plistlib.FMT_BINARY)
    subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", str(unsigned), "--output", str(signed)], check=True)
    print(f"Hotovo: {signed} (API {api_base})")


if __name__ == "__main__":
    main()
