const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

import * as mdiIcons from "https://unpkg.com/@mdi/js@6.4.95/mdi.js?module";

const keys = {
    "power": {"key": "POWER", "icon": "mdiPower"},
    "volume_up": {"key": "VOLUME_UP", "icon": "mdiVolumePlus"},
    "volume_down": {"key": "VOLUME_UP", "icon": "mdiVolumeMinus"},
    "volume_mute": {"key": "VOLUME_MUTE", "icon": "mdiVolumeMute"},
    "return": {"key": "BACK", "icon": "mdiArrowLeft"},
    "source": {"key": "KEY_SOURCE", "icon": "mdiVideoInputHdmi"},
    "info": {"key": "KEY_INFO", "icon": "mdiTelevisionGuide"},
    "home": {"key": "HOME", "icon": "mdiHome"},
    "channel_up": {"key": "KEY_CHUP", "icon": "mdiArrowUp"},
    "channel_down": {"key": "KEY_CHDOWN", "icon": "mdiArrowDown"},
    "up": {"key": "UP", "icon": "mdiChevronUp"},
    "left": {"key": "LEFT", "icon": "mdiChevronLeft"},
    "enter": {"key": "ENTER", "icon": "mdiCheckboxBlankCircle"},
    "right": {"key": "RIGHT", "icon": "mdiChevronRight"},
    "down": {"key": "DOWN", "icon": "mdiChevronDown"},
    "rewind": {"key": "KEY_REWIND", "icon": "mdiRewind"},
    "play": {"key": "PLAY", "icon": "mdiPlay"},
    "pause": {"key": "PAUSE", "icon": "mdiPause"},
    "fast_forward": {"key": "KEY_FF", "icon": "mdiFastForward"},
};

const sources = {
    "netflix": {"source": "Netflix", "icon": "mdiNetflix"},
    "spotify": {"source": "Spotify", "icon": "mdiSpotify"},
    "youtube": {"source": "YouTube", "icon": "mdiYoutube"},
};

var custom_keys = {};
var custom_sources = {};

var fireEvent = function(node, type, detail, options) {
    options = options || {};
    detail = detail === null || detail === undefined ? {} : detail;
    var event = new Event(type, {
        bubbles: false,
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
};

var holdtimer = null;
var holdaction = null;
var holdinterval = null;
var timer = null;

class TVCardServices extends LitElement {
    static get properties() {
        return {
            _hass: {},
            _config: {},
            _apps: {},
        };
    }

    static getStubConfig() {
        return {};
    }

    getCardSize() {
        return 7;
    }

    setConfig(config) {
        if (!config.entity) {
            console.log("Invalid configuration");
            return;
        }

        this._config = { theme: "default", ...config };
        custom_keys = config.custom_keys || {};
        custom_sources = config.custom_sources || {};

        this.loadCardHelpers();
        this.renderVolumeSlider();
    }

    isButtonEnabled(row, button) {
        if (!(this._config[row] instanceof Array)) return false;

        return this._config[row].includes(button);
    }

    set hass(hass) {
        this._hass = hass;
        if (this.volume_slider) this.volume_slider.hass = hass;
        if (this._hassResolve) this._hassResolve();
    }

    async loadCardHelpers() {
        this._helpers = await (window).loadCardHelpers();
        if (this._helpersResolve) this._helpersResolve();
    }

    async renderVolumeSlider() {
        if (this._helpers === undefined)
            await new Promise((resolve) => (this._helpersResolve = resolve));
        if (this._hass === undefined)
            await new Promise((resolve) => (this._hassResolve = resolve));
        this._helpersResolve = undefined;
        this._hassResolve = undefined;

        let slider_config = {
            "type": "custom:my-slider",
            "entity": "media_player.tv",
            "height": "50px",
            "mainSliderColor": "white",
            "secondarySliderColor": "rgb(60, 60, 60)",
            "mainSliderColorOff": "rgb(60, 60, 60)",
            "secondarySliderColorOff": "rgb(60, 60, 60)",
            "thumbWidth": "0px",
            "thumbHorizontalPadding": "0px",
            "radius": "25px",
        }

        if (this._config.slider_config instanceof Array) {
            slider_config = {...slider_config, ...this._config.slider_config };
        }

        this.volume_slider = await this._helpers.createCardElement(slider_config);
        this.volume_slider.style = "flex: 0.9;";
        this.volume_slider.ontouchstart = (e) => {
            e.stopImmediatePropagation();
            if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "light");
        }
        this.volume_slider.addEventListener("input", (e) => {
            if (this._config.enable_slider_feedback === undefined || this._config.enable_slider_feedback) fireEvent(window, "haptic", "light");
        }, true);

        this.volume_slider.hass = this._hass;
    }

    sendKey(key) {
        let entity_id = this._config.entity;

        this._hass.callService("androidtv", "adb_command", {
            command: key,
        }, { entity_id: entity_id });
    }

    changeSource(source) {
        let entity_id = this._config.entity;

        this._hass.callService("media_player", "select_source", {
            source: source,
            entity_id: entity_id,
        });
    }

    onClick(event) {
        event.stopImmediatePropagation();
        let click_action = () => {
            this.sendKey("ENTER");
            if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "light");
        }
        if (this._config.enable_double_click) {
            timer = setTimeout(click_action, 200);
        } else {
            click_action();
        }
    }

    onDoubleClick(event) {
        if (this._config.enable_double_click !== undefined && !this._config.enable_double_click) return;

        event.stopImmediatePropagation();

        clearTimeout(timer);
        timer = null;

        this.sendKey(this._config.double_click_keycode ? this._config.double_click_keycode : "BACK");
        if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "success");
    }

    onTouchStart(event) {
        event.stopImmediatePropagation();

        holdaction = "ENTER";
        holdtimer = setTimeout(() => {
            //hold
            holdinterval = setInterval(() => {
                this.sendKey(holdaction);
                if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "light");
            }, 200);
        }, 700);
        window.initialX = event.touches[0].clientX;
        window.initialY = event.touches[0].clientY;
    }

    onTouchEnd(event) {
        clearTimeout(timer);
        clearTimeout(holdtimer);
        clearInterval(holdinterval);

        holdtimer = null;
        timer = null;
        holdinterval = null;
        holdaction = null;
    }

    onTouchMove(event) {
        if (!initialX || !initialY) {
            return;
        }

        var currentX = event.touches[0].clientX;
        var currentY = event.touches[0].clientY;

        var diffX = initialX - currentX;
        var diffY = initialY - currentY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // sliding horizontally
            let key = diffX > 0 ? "LEFT" : "RIGHT";
            holdaction = key;
            this.sendKey(key);
        } else {
            // sliding vertically
            let key = diffY > 0 ? "UP" : "DOWN";
            holdaction = key;
            this.sendKey(key);
        }

        if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "selection");
        initialX = null;
        initialY = null;
    }

    handleActionClick(e) {
        let action = e.currentTarget.action;
        let info = custom_keys[action] || custom_sources[action] || keys[action] || sources[action];

        if (info.key) {
            this.sendKey(info.key);
        }
        else if (info.source) {
            this.changeSource(info.source);
        }
        else if (info.service) {
            const [domain, service] = info.service.split(".", 2);
            this._hass.callService(domain, service, info.service_data);
        }

        if (this._config.enable_button_feedback === undefined || this._config.enable_button_feedback) fireEvent(window, "haptic", "light");
    }

    buildIconButton(action) {
        let info = custom_keys[action] || custom_sources[action] || keys[action] || sources[action];
        let icon = info? info.icon : "";

        return html `
            <ha-icon-button
                .action="${action}"
                @click="${this.handleActionClick}"
                title="${action}"
                .path="${icon? mdiIcons[icon] : ""}"
            </ha-icon-button>
        `;
    }
    
    buildRow(content) {
        return html `
            <div class="row">
                ${content}
            </div>
        `;
    }
    buildButtonsFromActions(actions) {
        return actions.map((action) => this.buildIconButton(action));
    }
    
    render() {
        if (!this._config || !this._hass || !this.volume_slider) {
            return html ``;
        }

        const row_names = ["power_row", "channel_row", "apps_row", "source_row", "volume_row", "media_control_row", "navigation_row"];

        var content = [];
        Object.keys(this._config).forEach((row_name) => {
            if (row_names.includes(row_name)) {
                let row_actions = this._config[row_name];

                if (row_name === "volume_row") {
                    let volume_row = [];
                    if (this._config.volume_row == "buttons") {
                        volume_row = [
                            this.buildIconButton("volume_down"),
                            this.buildIconButton("volume_mute"),
                            this.buildIconButton("volume_up")
                        ];
                    } else if (this._config.volume_row == "slider") {
                        volume_row = [this.volume_slider];
                    }
                    content.push(volume_row);
                } else if (row_name === "navigation_row") {
                    let navigation_row = [];

                    if (this._config.navigation_row == "buttons") {
                        let up_row = [this.buildIconButton("up")];
                        let middle_row = [this.buildIconButton("left"), this.buildIconButton("enter"), this.buildIconButton("right")];
                        let down_row = [this.buildIconButton("down")];
                        navigation_row = [up_row, middle_row, down_row];
                    } else if (this._config.navigation_row == "touchpad") {
                        var touchpad = [html `
                            <toucharea
                                id="toucharea"
                                @click="${this.onClick}"
                                @dblclick="${this.onDoubleClick}"
                                @touchstart="${this.onTouchStart}"
                                @touchmove="${this.onTouchMove}"
                                @touchend="${this.onTouchEnd}">
                            </toucharea>
                        `];
                        navigation_row = [touchpad];
                    }
                    content.push(...navigation_row);
                } else {
                    let row_content = this.buildButtonsFromActions(row_actions);
                    content.push(row_content);
                }
            }
        });

        var content = content.map(this.buildRow);

        var output = html `
            ${this.renderStyle()}
            <ha-card .header="${this._config.title}">${content}</ha-card>
        `;

        return html `${output}`;
    }

    renderStyle() {
        return html `
            <style>
                .remote {
                    padding: 16px 0px 16px 0px;
                }
                img,
                ha-icon-button {
                    width: 64px;
                    height: 64px;
                    cursor: pointer;
                    --mdc-icon-size: 100%;
                }
                .row {
                    display: flex;
                    padding: 8px 36px 8px 36px;
                    justify-content: space-evenly;
                }
                .diagonal {
                    background-color: var(--light-primary-color);
                }
                toucharea {
                    border-radius: 30px;
                    flex-grow: 1;
                    height: 250px;
                    background: #6d767e;
                    touch-action: none;
                    text-align: center;
                }
            </style>
        `;
    }

    applyThemesOnElement(element, themes, localTheme) {
        if (!element._themes) {
            element._themes = {};
        }
        let themeName = themes.default_theme;
        if (localTheme === "default" || (localTheme && themes.themes[localTheme])) {
            themeName = localTheme;
        }
        const styles = Object.assign({}, element._themes);
        if (themeName !== "default") {
            var theme = themes.themes[themeName];
            Object.keys(theme).forEach((key) => {
                var prefixedKey = "--" + key;
                element._themes[prefixedKey] = "";
                styles[prefixedKey] = theme[key];
            });
        }
        if (element.updateStyles) {
            element.updateStyles(styles);
        } else if (window.ShadyCSS) {
            // implement updateStyles() method of Polemer elements
            window.ShadyCSS.styleSubtree(
                /** @type {!HTMLElement} */
                (element),
                styles
            );
        }

        const meta = document.querySelector("meta[name=theme-color]");
        if (meta) {
            if (!meta.hasAttribute("default-content")) {
                meta.setAttribute("default-content", meta.getAttribute("content"));
            }
            const themeColor =
                styles["--primary-color"] || meta.getAttribute("default-content");
            meta.setAttribute("content", themeColor);
        }
    }
}

customElements.define("danny-tv-card", TVCardServices);