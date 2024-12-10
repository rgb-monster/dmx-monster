let utils = {
    noop: () => {},
    slug: str => (str || "").replace(/[^\w-]+/g, "-").toLowerCase(),

    getStack() {
        let functions = [...new Error().stack.toString().matchAll(/.*at ([^\s]+).*/gm)];
        functions = functions.slice(1).map(rec => rec[1].replace("Proxy.", ""));
        return {stack: functions}; //.join(" <- ");
    },

    focusables: (container, traverse = true) => {
        // returns all keyboard navigable elements in the container
        function* elems(container) {
            // while it may be the 21st century, there is still no simple way to retrieve all the elements you see
            for (let elem of container.children) {
                let style = window.getComputedStyle(elem);
                if (style.display != "none" && style.visibility != "hidden" && !elem.disabled) {
                    if (
                        elem.matches("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") &&
                        elem.tabIndex != "-1" &&
                        !elem.disabled
                    ) {
                        yield elem;
                    } else if (traverse) {
                        for (let nested of elems(elem)) {
                            yield nested;
                        }
                    }
                }
            }
        }

        return [...elems(container)];
    },

    mousify(event) {
        // mousify touch events by looking at the first touch data
        if ("TouchEvent" in window && event instanceof TouchEvent) {
            // TouchEvent not present in Safari
            return event.touches[0];
        } else {
            return event;
        }
    },

    triggerDownload(dataURL, filename) {
        const a = document.createElement("a");
        a.href = dataURL;
        // Step 6: Set the download attribute and trigger the download
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Step 7: Clean up the temporary URL
        document.body.removeChild(a);
        URL.revokeObjectURL(dataURL);
    },

    saveToFile(contents, fileName) {
        utils.triggerDownload("data:text/plain;charset=utf-8," + encodeURIComponent(contents), fileName);
    },

    randomID(existing) {
        let badLetters = ["0", "1", "o", "i", "l"];
        if (existing) {
            // if we are being given existing ids we can choose much shorter ids as we can check for collisions
            let id;
            while (!id || existing.includes(id) || badLetters.some(letter => id.includes(letter))) {
                id = new Number(Math.floor(Math.random() * parseInt("zzzz", 36))).toString(36);
            }
            return id;
        } else {
            // othewise prefer a long enough safe ID
            return new Number(Math.floor(Math.random() * parseInt("zzzzzzzzzzz", 36))).toString(36);
        }
    },

    selectRandom(options) {
        return options[Math.floor(Math.random() * options.length)];
    },

    scrollIn: (elem, offset = 0) => {
        let box = elem.getBoundingClientRect();

        let getScrollParent = node => {
            if (node === null) {
                return null;
            }

            if (node != elem && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) {
                return node;
            } else {
                return getScrollParent(node.parentNode);
            }
        };

        let parent = getScrollParent(elem);
        if (!parent) {
            return;
        }
        let parentBox = parent.getBoundingClientRect();

        let top = box.top - parentBox.top;
        let vertNudge = (parentBox.height - box.height) * (offset || 0);
        let scrollTop = parent.scrollTop;
        if (top - vertNudge < 0) {
            scrollTop = parent.scrollTop + top - vertNudge;
        } else if (top + box.height + vertNudge > parentBox.height) {
            scrollTop = parent.scrollTop + top + box.height - parentBox.height + vertNudge;
        }

        let left = box.left - parentBox.left;
        let horizNudge = box.width * (offset || 0);
        let scrollLeft = parent.scrollLeft;
        if (left < 0) {
            scrollLeft = parent.scrollLeft + left - horizNudge;
        } else if (left + box.width > parentBox.width) {
            scrollLeft = parent.scrollLeft + left + box.width - parentBox.width + horizNudge;
        }

        parent.scrollTo(scrollLeft, scrollTop);
    },

    animationFrame: callback => {
        // this little wrapper will skip any dropped frames
        let currentCallback = null;
        return () => {
            window.cancelAnimationFrame(currentCallback);
            currentCallback = window.requestAnimationFrame(callback);
        };
    },

    isNumber: str => /^-?\d+\.?\d*$/.exec(str) != null,

    round(val, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.round(val * multiplier) / multiplier;
    },

    toggleList(list, val) {
        if (list.includes(val)) {
            return list.filter(item => item != val);
        } else {
            return [...list, val];
        }
    },

    routeChange(component) {
        // on routeChange the matched component won't match the passed in component anymore
        return component.$.type.name != component.$route.matched[0]?.components.default.name;
    },

    sum(values, accessor) {
        accessor = accessor || (val => val);
        return values && values.length ? values.map(item => accessor(item)).reduce((total, cur) => total + cur) : 0;
    },

    sumFees(shows, productionCurrency) {
        // sums up fees and returns a breakdown by currency
        // needs shows as shows (will) carry currency information
        // category: {ccy: {}, naive: sum, tricky: []}
        let res = {
            planned: {ccy: {}, naive: 0, tricky: []}, // total fees - includes slots in planning, offered, and confirmed stages
            committed: {ccy: {}, naive: 0, tricky: []}, // fees for slots that have been offered or confirmed
            settled: {ccy: {}, naive: 0, tricky: []}, // paid
            outstanding: {ccy: {}, naive: 0, tricky: []}, // outstanding money to pay
        };

        let now = new Date();

        for (let show of shows) {
            Object.values(show.slots).forEach(slot => {
                let addToCat = (category, currency, amount) => {
                    if (currency != "tricky") {
                        res[category].ccy[currency] = (res[category].ccy[currency] || 0) + amount;
                        res[category].naive = (res[category].naive || 0) + amount;
                    } else {
                        utils.setDefault(res[category], "tricky", []).push({show, slot, fee: amount});
                    }
                };

                if (!["planning", "offered", "confirmed"].includes(slot.status)) {
                    // ignore no-show and other slots with unexpected statuses
                    return;
                }

                let fee = (slot.fee || "").toString().trim();
                let {value, currency} = utils.parseMoney(fee);
                currency = currency || "";

                if (value == null && fee) {
                    currency = "tricky";
                    value = fee;
                }

                if (value) {
                    addToCat("planned", currency, value);

                    if (slot.actID && ["offered", "confirmed"].includes(slot.status)) {
                        addToCat("committed", currency, value);

                        if (slot.status == "confirmed" && !slot.settled && show.ts < now) {
                            addToCat("outstanding", currency, value);
                        }
                    }

                    if (slot.settled) {
                        addToCat("settled", currency, value);
                    }
                }
            });
        }

        Object.values(res).forEach(cat => {
            cat.ccySorted = utils.sort(Object.entries(cat.ccy), rec => rec[0]);
        });

        return res;
    },

    sort(values, keyFunc, ascending = true) {
        // exercise in NIH because i don't wanna pull in lodash just for a basic sort

        // shallow clone
        values = [...(values || [])];

        // turn ascening from bool into a 1/-1 we can multiply with
        ascending = ascending ? 1 : -1;

        values.sort((a, b) => {
            let aVals = keyFunc ? keyFunc(a) : a;
            let bVals = keyFunc ? keyFunc(b) : b;
            aVals = aVals?.constructor.name == "Array" ? aVals : [aVals];
            bVals = bVals?.constructor.name == "Array" ? bVals : [bVals];

            for (let i = 0; i < aVals.length; i++) {
                let aVal = aVals[i];
                let bVal = bVals[i];
                if (typeof aVal == "string") {
                    aVal = aVal.toLowerCase();
                }
                if (typeof bVal == "string") {
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) {
                    return -ascending;
                } else if (aVal > bVal) {
                    return ascending;
                } else {
                    continue;
                }
            }
            return 0;
        });
        return values;
    },

    sortOnce(keyFunc, sortFunc) {
        // a live sort can backfire when you, say, edit by name and then change the name
        // rather, we want a stable sort, and a re-sort on the next time the page is visited
        let sorted = null;
        let strKey = rec => keyFunc(rec).toString();

        let sortOnce = (values, ascending = true) => {
            if (!sorted) {
                sorted = utils.sort(values, sortFunc, ascending).map(rec => strKey(rec));
            }
            return utils.sort(values, val => (sorted.includes(strKey(val)) ? sorted.indexOf(strKey(val)) : 9999));
        };

        return sortOnce;
    },

    dedupe(list, accessor) {
        // dedupes a list by the given accessor and returns deduped list while maintaining order
        let byKey = {};
        let res = [];
        list.forEach(item => {
            let key = accessor(item);
            if (!byKey[key]) {
                byKey[key] = true;
                res.push(item);
            }
        });

        return res;
    },

    isDict(obj) {
        return obj && !["number", "string", "boolean"].includes(typeof obj) && !Array.isArray(obj);
    },

    calcDeltas(source, target) {
        // recurse through target to spot any additions or updates
        let updates = {};
        let removals = [];

        let hasOwnProperty = (o, ...args) => Object.prototype.hasOwnProperty.call(o, ...args);

        Object.entries(target).forEach(([field, targetVal]) => {
            if (!hasOwnProperty(source, field)) {
                // we have added a new field, we can stop here rather than traversing deeper
                updates[field] = target[field];
            } else if (JSON.stringify(source[field]) == JSON.stringify(targetVal)) {
                // things are the same - we do nothing
            } else if (utils.isDict(targetVal)) {
                // traverse into child objects
                let nested = utils.calcDeltas(source[field], targetVal);
                Object.entries(nested.updates).forEach(([nestedField, nestedVal]) => {
                    updates[`${field}.${nestedField}`] = nestedVal;
                });
                nested.removals.forEach(removal => {
                    removals.push(`${field}.${removal}`);
                });
            } else {
                // if values are not the same and we don't have an object, we assume overwrite (won't mess with lists)
                updates[field] = target[field];
            }
        });

        Object.entries(source).forEach(([field, sourceVal]) => {
            if (!hasOwnProperty(target, field)) {
                // target is missing the specific field - mark as removed
                // we do not traverse in removals as updates will do that for us
                removals.push(field);
            }
        });

        return {updates, removals};
    },

    getDotField(obj, path, createMissingContainers) {
        let parts = path.split(".");
        let leaf = parts.splice(-1, 1)[0];
        let containerPath = parts.join("."); // container path after we have plucked the leaf

        let container = obj;
        for (let part of parts) {
            if (createMissingContainers) {
                container = utils.setDefault(container, part, {});
            } else {
                container = container[part];
            }
        }

        return {container, containerPath, leaf};
    },

    applyDotChanges(mainObj, changes, createMissingContainers) {
        Object.entries(changes).forEach(([path, val]) => {
            let operation = "update";
            if (path == "$delete") {
                // for deleting fields we do {'$delete' : 'path.to.field'}
                // so we need to swap the path and val around
                operation = "delete";
                path = val;
                if (Array.isArray(path)) {
                    path.forEach(p => {
                        this.applyDotChanges(mainObj, {$delete: p});
                    });
                    return;
                }
            } else if (path == "$push") {
                operation = "push";
                path = val.path;
            } else if (path == "$pop") {
                operation = "pop";
                path = val.path;
            }

            let {container, leaf} = this.getDotField(mainObj, path, createMissingContainers);

            if (operation == "delete") {
                if (container) {
                    delete container[leaf];
                }
            } else if (operation == "push") {
                let pos = val.position != undefined ? val.position : container[leaf].length;
                container[leaf].splice(pos, 0, val.value);
            } else if (operation == "pop") {
                container[leaf].splice(val.position, 1);
            } else {
                try {
                    container[leaf] = val;
                } catch (error) {
                    console.warn(`Trying to set value for '${path}' but we don't have an object there`, changes);
                    console.warn(error);
                }
            }
        });
    },

    logChanges(changes, groupMessage) {
        // insta-save
        console.groupCollapsed(
            `%c${groupMessage} (${JSON.stringify(changes).length} bytes)`,
            "color: 333; font-weight: normal; background: #eee; display: inline-block; padding: 3px 5px;"
        );
        Object.entries(JSON.parse(JSON.stringify(changes))).forEach(([key, val]) => {
            console.log(key, val);
        });
        console.groupEnd();
    },

    setPageTitle(title) {
        // add " - Confirmed" suffix to page title unless the "showtime" or "confirmed" are already present in the title
        title = title || "";
        document.title = title;
    },

    range(start, end, step) {
        if (end === undefined) {
            [start, end, step] = [0, start, 1];
        }

        step = Math.abs(step) || 1;
        if (end < start) {
            step = step * -1;
        }

        function* iterator() {
            for (let i = start; start < end ? i < end : i > end; i += step) {
                yield i;
            }
        }

        return [...iterator()];
    },

    shuffle(array) {
        // from bostock via stack overflow
        array = array || [];
        let m = array.length;
        let t;
        let i;

        // While there remain elements to shuffle…
        while (m) {
            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);

            // And swap it with the current element.
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    },

    random(start, end) {
        if (Array.isArray(start) || typeof start == "string") {
            // we've been given a list return end number of items from the list
            end = Math.min(Math.max(end || 1, 0), start.length);
            let items = utils.shuffle(start);
            return end > 1 ? items.slice(0, end) : items[0];
        } else if (!end) {
            return Math.round(Math.random() * start);
        } else {
            return start + Math.round(Math.random() * (end - start));
        }
    },

    formatTS(ts, format) {
        ts = utils.parseTS(ts);
        return ts.strftime(format);
    },

    capitalize: label => (!label ? "" : `${label[0].toUpperCase()}${label.slice(1, label.length)}`),

    zeroPad: num => new String(parseInt(num)).padStart(2, "0"),

    fileSize(bytes) {
        let kbytes = bytes / 1024;
        if (kbytes < 1000) {
            return `${utils.round(kbytes, 2)}KB`;
        } else {
            return `${utils.round(kbytes / 1024, 2)}MB`;
        }
    },

    pluralize(n, singular, plural) {
        n = Array.isArray(n) ? n.length : n;
        return `${n} ${n == 1 ? singular : plural}`;
    },

    pluralizeNoun(n, singular, plural) {
        n = Array.isArray(n) ? n.length : n;
        return n == 1 ? singular : plural;
    },

    sanitize(obj) {
        // trim whitespace for now, maybe other insanity later
        // deep clone, to avoid side-effects
        obj = JSON.parse(JSON.stringify(obj));
        if (obj == null || typeof obj == "number") {
            return obj;
        } else if (Array.isArray(obj)) {
            obj.forEach((item, idx) => {
                obj[idx] = this.sanitize(item);
            });
            return obj;
        } else if (typeof obj == "string") {
            return obj.trim();
        } else {
            Object.entries(obj).forEach(([key, val]) => {
                obj[key] = this.sanitize(val);
            });
            return obj;
        }
    },

    normalize(obj) {
        return utils.sanitize(obj).toString().trim().toLowerCase();
    },

    isEmpty(obj) {
        return !obj || Object.keys(obj).length == 0;
    },

    humanNumber(val) {
        // https://stackoverflow.com/a/51322015/46617
        if (typeof val == "string") {
            val = parseFloat(val.replace(/,/, "")) || 0;
        }
        return val.toLocaleString();
    },

    replaceAll(str, from, to) {
        // escape any special symbols
        from = from.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
        return str.replace(new RegExp(from, "g"), to);
    },

    setDefault(obj, key, defaultVal) {
        obj[key] = obj[key] || defaultVal;
        return obj[key];
    },

    defaultDict(defaultClass) {
        return new Proxy(
            {},
            {
                get: (target, name) => {
                    if (target[name] == undefined) {
                        target[name] = new defaultClass();
                    }
                    return target[name];
                },
            }
        );
    },

    addEventListener(watcher, type, listener) {
        // Bug with Safari re MediaQueryList not inheriting addEventListener
        // https://github.com/mdn/sprints/issues/858#issuecomment-537992077
        if (watcher.addEventListener) {
            watcher.addEventListener(type, listener);
        } else if (watcher.addListener) {
            watcher.addListener(listener);
        }
    },
    removeEventListener(watcher, type, listener) {
        // Bug with Safari re MediaQueryList not inheriting removeEventListener
        // https://github.com/mdn/sprints/issues/858#issuecomment-537992077
        if (watcher.removeEventListener) {
            watcher.removeEventListener(type, listener);
        } else if (watcher.removeListener) {
            watcher.removeListener(listener);
        }
    },

    async inlineIcon(name, filled) {
        // for localhost development only since in prod we have a single static file
        this._knownIcons = this._knownIcons || {};
        let id = `${name}-${filled}`;
        if (this._knownIcons[id]) {
            return;
        }
        this._knownIcons[id] = true;

        let path = `/material-icons/${name}/${filled ? "baseline" : "outline"}.svg`;
        let data = await fetch(path);
        let svg = await data.text();
        if (!svg) {
            return;
        }
        let contentsRe = /<svg[^>]*>(?<contents>(.)*)<\/svg>/;
        let contents = contentsRe.exec(svg)?.groups.contents;

        let symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
        symbol.setAttribute("id", `icon-${name}${filled ? "-filled" : ""}`);
        symbol.setAttribute("viewBox", "0 0 24 24");
        symbol.innerHTML = contents;

        if (!this._iconContainer) {
            this._iconContainer = document.createElement("svg");
            this._iconContainer.style["display"] = "none";
            document.body.append(this._iconContainer);
        }
        this._iconContainer.appendChild(symbol);
    },

    async sleep(seconds) {
        return new Promise(resolve => {
            setTimeout(resolve, seconds * 1000);
        });
    },

    isTouch() {
        return "ontouchstart" in window;
    },

    hasMouse() {
        return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    },

    importToComp(components) {
        // converts results of eagerGlob to actually usable components
        return Object.fromEntries(
            Object.entries(components).map(([key, comp]) => {
                let componentName = key.split("/").slice(-1)[0].split(".")[0];
                return [componentName, comp.default || comp];
            })
        );
    },
};

utils.filters = Object.fromEntries(
    [
        "noop",
        "capitalize",
        "round",
        "range",
        "formatTS",
        "humanNumber",
        "toggleList",
        "pluralize",
        "pluralizeNoun",
        "sort",
        "isEmpty",
        "zeroPad",
        "normalize",
        "fileSize",
        "slug",
    ].map(funcName => [funcName, utils[funcName]])
);

export default utils;
