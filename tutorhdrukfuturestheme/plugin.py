from __future__ import annotations

import os
import typing as t
from glob import glob

import importlib_resources
from tutor import hooks
from tutor.__about__ import __version_suffix__
from tutormfe.hooks import PLUGIN_SLOTS

from .__about__ import __version__

# Handle version suffix in main mode, just like tutor core
if __version_suffix__:
    __version__ += "-" + __version_suffix__


################# Configuration
config: t.Dict[str, t.Dict[str, t.Any]] = {
    # Add here your new settings
    "defaults": {
        "VERSION": __version__,
        "WELCOME_MESSAGE": "The place for all your online learning",
        "PRIMARY_COLOR": "#2e34ba",  # Futures indigo
        "ENABLE_DARK_TOGGLE": True,
        # NOTE: the shared `theme` cookie's domain is read from the cross-plugin
        # `BASE_DOMAIN` config (owned by tutor-contrib-hdrukplugin) directly in
        # dark-theme.js as `{{ BASE_DOMAIN }}`. We deliberately do NOT register a
        # BASE_DOMAIN default here: duplicate CONFIG_DEFAULTS for the same key are
        # resolved by plugin load order, so ownership must live in one plugin.
        # Footer links are dictionaries with a "title" and "url"
        # To remove all links, run:
        # tutor config save --set HDRUKFUTURESTHEME_FOOTER_NAV_LINKS=[]
        "FOOTER_NAV_LINKS": [
            {"title": "About Us", "url": "/about"},
            {"title": "Terms of Service", "url": "/terms-of-service"},
            {"title": "Privacy Policy", "url": "/privacy-policy"},
            {"title": "Help", "url": "/help"},
            {"title": "Contact Us", "url": "/help"},
        ],
    },
    "unique": {},
    "overrides": {},
}

# Theme templates
hooks.Filters.ENV_TEMPLATE_ROOTS.add_item(
    str(importlib_resources.files("tutorhdrukfuturestheme") / "templates")
)
# This is where the theme is rendered in the openedx build directory
hooks.Filters.ENV_TEMPLATE_TARGETS.add_items(
    [
        ("hdrukfuturestheme", "build/openedx/themes"),
    ],
)

# Force the rendering of scss files, even though they are included in a "partials" directory
hooks.Filters.ENV_PATTERNS_INCLUDE.add_items(
    [
        r"hdrukfuturestheme/lms/static/sass/partials/lms/theme/",
        r"hdrukfuturestheme/cms/static/sass/partials/cms/theme/",
    ]
)


# init script: set theme automatically
with open(
    os.path.join(
        str(importlib_resources.files("tutorhdrukfuturestheme") / "templates"),
        "hdrukfuturestheme",
        "tasks",
        "init.sh",
    ),
    encoding="utf-8",
) as task_file:
    hooks.Filters.CLI_DO_INIT_TASKS.add_item(("lms", task_file.read()))


# Override openedx & mfe docker image names
@hooks.Filters.CONFIG_DEFAULTS.add(priority=hooks.priorities.LOW)
def _override_openedx_docker_image(
    items: list[tuple[str, t.Any]],
) -> list[tuple[str, t.Any]]:
    openedx_image = ""
    mfe_image = ""
    for k, v in items:
        if k == "DOCKER_IMAGE_OPENEDX":
            openedx_image = v
        elif k == "MFE_DOCKER_IMAGE":
            mfe_image = v
    if openedx_image:
        items.append(("DOCKER_IMAGE_OPENEDX", f"{openedx_image}-hdruk"))
    if mfe_image:
        items.append(("MFE_DOCKER_IMAGE", f"{mfe_image}-hdruk"))
    return items


# Load all configuration entries
hooks.Filters.CONFIG_DEFAULTS.add_items(
    [(f"HDRUKFUTURESTHEME_{key}", value) for key, value in config["defaults"].items()]
)
hooks.Filters.CONFIG_UNIQUE.add_items(
    [(f"HDRUKFUTURESTHEME_{key}", value) for key, value in config["unique"].items()]
)
hooks.Filters.CONFIG_OVERRIDES.add_items(list(config["overrides"].items()))


#  MFEs that are styled using Indigo
hdruk_styled_mfes = [
    "learning",
    "learner-dashboard",
    "profile",
    "account",
    "discussions",
]


for mfe in hdruk_styled_mfes:
    hooks.Filters.ENV_PATCHES.add_items(
        [
            (
                f"mfe-dockerfile-post-npm-install-{mfe}",
                """
RUN npm install '@edx/brand@git+https://github.com/evtdigital-hdruk/brand-hdruk.git#hdr-uk/v3.1.0'

""",
            )
        ]
    )


hooks.Filters.ENV_PATCHES.add_item(
    (
        "mfe-dockerfile-post-npm-install-authn",
        "RUN npm install '@edx/brand@git+https://github.com/evtdigital-hdruk/brand-hdruk.git#hdr-uk/v3.1.0'",
    )
)

# Include js file in lms main.html, main_django.html, and certificate.html

hooks.Filters.ENV_PATCHES.add_items(
    [
        # for production
        (
            "openedx-common-assets-settings",
            """
javascript_files = ['base_application', 'application', 'certificates_wv']
# theme-core.js MUST precede dark-theme.js
dark_theme_filepath = ['hdrukfuturestheme/js/theme-core.js', 'hdrukfuturestheme/js/dark-theme.js']

for filename in javascript_files:
    if filename in PIPELINE['JAVASCRIPT']:
        PIPELINE['JAVASCRIPT'][filename]['source_filenames'] += dark_theme_filepath
""",
        ),
        # for development
        (
            "openedx-lms-development-settings",
            """
javascript_files = ['base_application', 'application', 'certificates_wv']
# theme-core.js MUST precede dark-theme.js
dark_theme_filepath = ['hdrukfuturestheme/js/theme-core.js', 'hdrukfuturestheme/js/dark-theme.js']

for filename in javascript_files:
    if filename in PIPELINE['JAVASCRIPT']:
        PIPELINE['JAVASCRIPT'][filename]['source_filenames'] += dark_theme_filepath

MFE_CONFIG['HDRUKFUTURESTHEME_ENABLE_DARK_TOGGLE'] = {{ HDRUKFUTURESTHEME_ENABLE_DARK_TOGGLE }}
""",
        ),
        (
            "openedx-lms-production-settings",
            """
MFE_CONFIG['HDRUKFUTURESTHEME_ENABLE_DARK_TOGGLE'] = {{ HDRUKFUTURESTHEME_ENABLE_DARK_TOGGLE }}
""",
        ),
    ]
)


# Apply patches from tutor-hdrukfuturestheme
for path in glob(
    os.path.join(
        str(importlib_resources.files("tutorhdrukfuturestheme") / "patches"),
        "*",
    )
):
    with open(path, encoding="utf-8") as patch_file:
        hooks.Filters.ENV_PATCHES.add_item((os.path.basename(path), patch_file.read()))
