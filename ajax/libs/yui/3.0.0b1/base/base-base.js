YUI.add('base-base', function(Y) {

    /**
     * <p>
     * An augmentable class, which provides the augmented class with the ability to host plugins.
     * It adds <a href="#method_plug">plug</a> and <a href="#method_unplug">unplug</a> methods to the augmented class, which can 
     * be used to add or remove plugins from instances of the class.
     * </p>
     *
     * <p>Plugins can also be added through the constructor configuration object passed to the host class' constructor using
     * the "plugins" property. Supported values for the "plugins" property are those defined by the <a href="#method_plug">plug</a> method. 
     * 
     * For example the following code would add the AnimPlugin and IOPlugin to Overlay (the plugin host):
     * <xmp>
     * var o = new Overlay({plugins: [ AnimPlugin, {fn:IOPlugin, cfg:{section:"header"}}]});
     * </xmp>
     * </p>
     * <p>
     * Plug.Host's protected <a href="#method_initPlugins">_initPlugins</a> and <a href="#method_destroyPlugins">_destroyPlugins</a> 
     * methods should be invoked by the host class at the appropriate point in the host's lifecyle. This is done by default for 
     * the Base class, so developers extending Base or Widget don't need to do anything to enable plugin support.
     * </p>
     *
     * @class Plugin.Host
     */

    var L = Y.Lang;

    function PluginHost(config) {
        this._plugins = {};
    }

    PluginHost.prototype = {

        /**
         * Adds a plugin to the host object. This will instantiate the 
         * plugin and attach it to the configured namespace on the host object.
         *
         * @method plug
         * @chainable
         * @param p {Function | Object |Array} Accepts the plugin class, or an 
         * object with a "fn" property specifying the plugin class and 
         * a "cfg" property specifying the configuration for the Plugin.
         * <p>
         * Additionally an Array can also be passed in, with the above function or 
         * object values, allowing the user to add multiple plugins in a single call.
         * </p>
         * @param config (Optional) If the first argument is the plugin class, the second argument
         * can be the configuration for the plugin.
         * @return {Base} A reference to the host object
         */

        plug: function(p, config) {
            if (p) {
                if (L.isFunction(p)) {
                    this._plug(p, config);
                } else if (L.isArray(p)) {
                    for (var i = 0, ln = p.length; i < ln; i++) {
                        this.plug(p[i]);
                    }
                } else {
                    this._plug(p.fn, p.cfg);
                }
            }
            return this;
        },

        /**
         * Removes a plugin from the host object. This will destroy the 
         * plugin instance and delete the namepsace from the host object. 
         *
         * @method unplug
         * @param {String | Function} plugin The namespace of the plugin, or the plugin class with the static NS namespace property defined. If not provided,
         * all registered plugins are unplugged.
         * @return {Base} A reference to the host object
         * @chainable
         */
        unplug: function(plugin) {
            if (plugin) {
                this._unplug(plugin);
            } else {
                var ns;
                for (ns in this._plugins) {
                    if (this._plugins.hasOwnProperty(ns)) {
                        this._unplug(ns);
                    }
                }
            }
            return this;
        },

        /**
         * Determines if a plugin has plugged into this host.
         *
         * @method hasPlugin
         * @param {String} ns The plugin's namespace
         * @return {boolean} returns true, if the plugin has been plugged into this host, false otherwise.
         */
        hasPlugin : function(ns) {
            return (this._plugins[ns] && this[ns]);
        },

        /**
         * Initializes static plugins registered on the host (using the
         * Base.plug static method) and any plugins passed to the 
         * instance through the "plugins" configuration property.
         *
         * @method _initPlugins
         * @param {Config} config The configuration object with property name/value pairs.
         * @private
         */
        _initPlugins: function(config) {

            // Class Configuration
            var classes = this._getClasses(),
                plug = [],
                unplug = {},
                constructor, i, classPlug, classUnplug, pluginClassName;

            //TODO: Room for optimization. Can we apply statically/unplug in same pass?
            for (i = classes.length - 1; i >= 0; i--) {
                constructor = classes[i];

                classUnplug = constructor._UNPLUG;
                if (classUnplug) {
                    // subclasses over-write
                    Y.mix(unplug, classUnplug, true);
                }

                classPlug = constructor._PLUG;
                if (classPlug) {
                    // subclasses over-write
                    Y.mix(plug, classPlug, true);
                }
            }
    
            for (pluginClassName in plug) {
                if (plug.hasOwnProperty(pluginClassName)) {
                    if (!unplug[pluginClassName]) {
                        this.plug(plug[pluginClassName]);
                    }
                }
            }
    
            // User Configuration
            if (config && config.plugins) {
                this.plug(config.plugins);
            }
        },

        /**
         * Unplugs and destroys all plugins on the host
         * @method _destroyPlugins
         * @private
         */
        _destroyPlugins: function() {
            this._unplug();
        },

        /**
         * Private method used to instantiate and attach plugins to the host
         *
         * @method _plug
         * @param {Function} PluginClass The plugin class to instantiate
         * @param {Object} config The configuration object for the plugin
         * @private
         */
        _plug: function(PluginClass, config) {
            if (PluginClass && PluginClass.NS) {
                var ns = PluginClass.NS;
    
                config = config || {};
                config.host = this;
    
                if (this.hasPlugin(ns)) {
                    // Update config
                    this[ns].setAttrs(config);
                } else {
                    // Create new instance
                    this[ns] = new PluginClass(config);
                    this._plugins[ns] = PluginClass;
                }
            }
        },

        /**
         * Unplugs and destroys a plugin already instantiated with the host.
         *
         * @method _unplug
         * @private
         * @param {String | Function} plugin The namespace for the plugin, or a plugin class with the static NS property defined.
         */
        _unplug : function(plugin) {
            var ns = plugin, 
                plugins = this._plugins;
    
            if (L.isFunction(plugin)) {
                ns = plugin.NS;
                if (ns && (!plugins[ns] || plugins[ns] !== plugin)) {
                    ns = null;
                }
            }
    
            if (ns) {
                if (this[ns]) {
                    this[ns].destroy();
                    delete this[ns];
                }
                if (plugins[ns]) {
                    delete plugins[ns];
                }
            }
        }
    };
    
    /**
     * Registers plugins to be instantiated at the class level (plugins 
     * which should be plugged into every instance of the class by default).
     *
     * @method Plugin.Host.plug
     * @static
     *
     * @param {Function} hostClass The host class on which to register the plugins
     * @param {Function | Array} plugin Either the plugin class, an array of plugin classes or an array of objects (with fn and cfg properties defined)
     * @param {Object} config (Optional) If plugin is the plugin class, the configuration for the plugin
     */
    PluginHost.plug = function(hostClass, plugin, config) {
        // Cannot plug into Base, since Plugins derive from Base [ will cause infinite recurrsion ]
        var p, i, l, name;
    
        if (hostClass !== Y.Base) {
            hostClass._PLUG = hostClass._PLUG || {};
    
            if (!L.isArray(plugin)) {
                if (config) {
                    plugin = {fn:plugin, cfg:config};
                }
                plugin = [plugin];
            }
    
            for (i = 0, l = plugin.length; i < l;i++) {
                p = plugin[i];
                name = p.NAME || p.fn.NAME;
                hostClass._PLUG[name] = p;
            }
        }
    };

    /**
     * Unregisters any class level plugins which have been registered by the host class, or any
     * other class in the hierarchy.
     *
     * @method Plugin.Host.unplug
     * @static
     *
     * @param {Function} hostClass The host class from which to unregister the plugins
     * @param {Function | Array} plugin The plugin class, or an array of plugin classes
     */
    PluginHost.unplug = function(hostClass, plugin) {
        var p, i, l, name;
    
        if (hostClass !== Y.Base) {
            hostClass._UNPLUG = hostClass._UNPLUG || {};
    
            if (!L.isArray(plugin)) {
                plugin = [plugin];
            }
    
            for (i = 0, l = plugin.length; i < l; i++) {
                p = plugin[i];
                name = p.NAME;
                if (!hostClass._PLUG[name]) {
                    hostClass._UNPLUG[name] = p;
                } else {
                    delete hostClass._PLUG[name];
                }
            }
        }
    };

    Y.namespace("Plugin").Host = PluginHost;

    /**
     * The base module provides the Base class, which objects requiring attribute and custom event support can extend. 
     * The module also provides two ways to reuse code - An augmentable Plugin.Host interface which provides plugin support 
     * (which is augmented to the Base class) and Base.build which provides a way to 
     * build custom classes using extensions.
     *
     * @module base
     */

    /**
     * The base-base submodule provides the Base class and augmentable Plugin.Host implementation, 
     * without the extension support provided by Base.build.
     *
     * @module base
     * @submodule base-base
     */
    var O = Y.Object,
        DOT = ".",
        DESTROY = "destroy",
        INIT = "init",
        INITIALIZED = "initialized",
        DESTROYED = "destroyed",
        INITIALIZER = "initializer",
        OBJECT_CONSTRUCTOR = Object.prototype.constructor,
        DEEP = "deep",
        SHALLOW = "shallow",
        VALUE = "value",
        DESTRUCTOR = "destructor";

    /**
     * <p>
     * A base class which objects requiring attributes and custom event support can 
     * extend. Base also handles the chaining of initializer and destructor methods across 
     * the hierarchy as part of object construction and destruction. Additionally, attributes configured 
     * through the static <a href="#property_Base.ATTRS">ATTRS</a> property for each class 
     * in the hierarchy will be initialized by Base.
     * </p>
     *
     * <p>
     * The static <a href="#property_Base.NAME">NAME</a> property of each class extending 
     * from Base will be used as the identifier for the class, and is used by Base to prefix 
     * all events fired by instances of that class.
     * </p>
     * @class Base
     * @constructor
     * @uses Attribute
     * @uses Plugin.Host
     *
     * @param {Object} config Object with configuration property name/value pairs
     */
    function Base() {

        Y.Attribute.call(this);
        Y.Plugin.Host.call(this);

        this._silentInit = this._silentInit || false;
        if (this._lazyAddAttrs !== false) { this._lazyAddAttrs = true; }

        this.init.apply(this, arguments);
    }

    /**
     * The list of properties which can be configured for 
     * each attribute (e.g. setter, getter, writeOnce, readOnly etc.)
     *
     * @property Base._ATTR_CFG
     * @type Array
     * @static
     * @private
     */
    Base._ATTR_CFG = Y.Attribute._ATTR_CFG.concat("cloneDefaultValue");

    /**
     * <p>
     * The string to be used to identify instances of 
     * this class, for example in prefixing events.
     * </p>
     * <p>
     * Classes extending Base, should define their own
     * static NAME property, which should be camelCase by
     * convention (e.g. MyClass.NAME = "myClass";).
     * </p>
     * @property Base.NAME
     * @type String
     * @static
     */
    Base.NAME = 'base';

    /**
     * The default set of attributes which will be available for instances of this class, and 
     * their configuration. In addition to the configuration properties listed by 
     * Attribute's <a href="Attribute.html#method_addAttr">addAttr</a> method, the attribute 
     * can also be configured with a "cloneDefaultValue" property, which defines how the statically
     * defined value field should be protected ("shallow", "deep" and false are supported values). 
     *
     * By default if the value is an object literal or an array it will be "shallow" cloned, to 
     * protect the default value.
     *
     * @property Base.ATTRS
     * @type Object
     * @static
     */
    Base.ATTRS = {
        /**
         * Flag indicating whether or not this object
         * has been through the init lifecycle phase.
         *
         * @attribute initialized
         * @readonly
         * @default false
         * @type boolean
         */
        initialized: {
            readOnly:true,
            value:false
        },

        /**
         * Flag indicating whether or not this object
         * has been through the destroy lifecycle phase.
         *
         * @attribute destroyed
         * @readonly
         * @default false
         * @type boolean
         */
        destroyed: {
            readOnly:true,
            value:false
        }
    };

    Base.prototype = {

        /**
         * Init lifecycle method, invoked during construction.
         * Fires the init event prior to setting up attributes and 
         * invoking initializers for the class hierarchy.
         *
         * @method init
         * @final
         * @chainable
         * @param {Object} config Object with configuration property name/value pairs
         * @return {Base} A reference to this object
         */
        init: function(config) {

            /**
             * The string used to identify the class of this object.
             *
             * @deprecated Use this.constructor.NAME
             * @property name
             * @type String
             */
            this._yuievt.config.prefix = this.name = this.constructor.NAME;

            /**
             * <p>
             * Lifecycle event for the init phase, fired prior to initialization. 
             * Invoking the preventDefault() method on the event object provided 
             * to subscribers will prevent initialization from occuring.
             * </p>
             * <p>
             * Subscribers to the "after" momemt of this event, will be notified
             * after initialization of the object is complete (and therefore
             * cannot prevent initialization).
             * </p>
             *
             * @event init
             * @preventable _defInitFn
             * @param {EventFacade} e Event object, with a cfg property which 
             * refers to the configuration object passed to the constructor.
             */
            if (!this._silentInit) {
                this.publish(INIT, {
                    queuable:false,
                    defaultFn:this._defInitFn
                });
            }

            if (config) {
                if (config.on) {
                    this.on(config.on);
                }
                if (config.after) {
                    this.after(config.after);
                }
            }

            if (!this._silentInit) {
                this.fire(INIT, {cfg: config});
            } else {
                this._defInitFn({cfg: config});
            }

            return this;
        },

        /**
         * <p>
         * Destroy lifecycle method. Fires the destroy
         * event, prior to invoking destructors for the
         * class hierarchy.
         * </p>
         * <p>
         * Subscribers to the destroy
         * event can invoke preventDefault on the event object, to prevent destruction
         * from proceeding.
         * </p>
         * @method destroy
         * @return {Base} A reference to this object
         * @final
         * @chainable
         */
        destroy: function() {

            /**
             * <p>
             * Lifecycle event for the destroy phase, 
             * fired prior to destruction. Invoking the preventDefault 
             * method on the event object provided to subscribers will 
             * prevent destruction from proceeding.
             * </p>
             * <p>
             * Subscribers to the "after" moment of this event, will be notified
             * after destruction is complete (and as a result cannot prevent
             * destruction).
             * </p>
             * @event destroy
             * @preventable _defDestroyFn
             * @param {EventFacade} e Event object
             */
            this.publish(DESTROY, {
                queuable:false,
                defaultFn: this._defDestroyFn
            });
            this.fire(DESTROY);
            return this;
        },

        /**
         * Default init event handler
         *
         * @method _defInitFn
         * @param {EventFacade} e Event object, with a cfg property which 
         * refers to the configuration object passed to the constructor.
         * @protected
         */
        _defInitFn : function(e) {
            this._initHierarchy(e.cfg);
            this._initPlugins(e.cfg);

            if (!this._silentInit) {
                this._set(INITIALIZED, true);
            } else {
                this._conf.add(INITIALIZED, VALUE, true);
            }
        },

        /**
         * Default destroy event handler
         *
         * @method _defDestroyFn
         * @param {EventFacade} e Event object
         * @protected
         */
        _defDestroyFn : function(e) {
            this._destroyHierarchy();
            this._destroyPlugins();
            this._set(DESTROYED, true);
        },

        /**
         * Returns the class hierarchy for this object, with Base being the last class in the array.
         *
         * @method _getClasses
         * @protected
         * @return {Function[]} An array of classes (constructor functions), making up the class hierarchy for this object.
         * This value is cached the first time the method, or _getAttrCfgs, is invoked. Subsequent invocations return the 
         * cached value.
         */
        _getClasses : function() {
            if (!this._classes) {
                this._initHierarchyData();
            }
            return this._classes;
        },

        /**
         * Returns an aggregated set of attribute configurations, by traversing the class hierarchy.
         *
         * @method _getAttrCfgs
         * @protected
         * @return {Object} The hash of attribute configurations, aggregated across classes in the hierarchy
         * This value is cached the first time the method, or _getClasses, is invoked. Subsequent invocations return
         * the cached value.
         */
        _getAttrCfgs : function() {
            if (!this._attrs) {
                this._initHierarchyData();
            }
            return this._attrs;
        },

        /**
         * A helper method used when processing ATTRS across the class hierarchy during 
         * initialization. Returns a disposable object with the attributes defined for 
         * the provided class, extracted from the set of all attributes passed in .
         *
         * @method _filterAttrCfs
         * @private
         *
         * @param {Function} clazz The class for which the desired attributes are required.
         * @param {Object} allCfgs The set of all attribute configurations for this instance. 
         * Attributes will be removed from this set, if they belong to the filtered class, so
         * that by the time all classes are processed, allCfgs will be empty.
         * 
         * @return {Object} The set of attributes belonging to the class passed in, in the form
         * of an object with attribute name/configuration pairs.
         */
        _filterAttrCfgs : function(clazz, allCfgs) {
            var cfgs = null, attr, attrs = clazz.ATTRS;

            if (attrs) {
                for (attr in attrs) {
                    if (attrs.hasOwnProperty(attr) && allCfgs[attr]) {
                        cfgs = cfgs || {};
                        cfgs[attr] = allCfgs[attr];
                        delete allCfgs[attr];
                    }
                }
            }

            return cfgs;
        },

        /**
         * A helper method used by _getClasses and _getAttrCfgs, which determines both
         * the array of classes and aggregate set of attribute configurations
         * across the class hierarchy for the instance.
         * 
         * @method _initHierarchyData
         * @private
         */
        _initHierarchyData : function() {
            var c = this.constructor, 
                classes = [],
                attrs = [];

            while (c) {
                // Add to classes
                classes[classes.length] = c;

                // Add to attributes
                if (c.ATTRS) {
                    attrs[attrs.length] = c.ATTRS;
                }
                c = c.superclass ? c.superclass.constructor : null;
            }

            this._classes = classes;
            this._attrs = this._aggregateAttrs(attrs);
        },

        /**
         * A helper method, used by _initHierarchyData to aggregate 
         * attribute configuration across the instances class hierarchy.
         *
         * The method will potect the attribute configuration value to protect the statically defined 
         * default value in ATTRS if required (if the value is an object literal, array or the 
         * attribute configuration has cloneDefaultValue set to shallow or deep).
         *
         * @method _aggregateAttrs
         * @private
         * @param {Array} allAttrs An array of ATTRS definitions across classes in the hierarchy 
         * (subclass first, Base last)
         * @return {Object} The aggregate set of ATTRS definitions for the instance
         */
        _aggregateAttrs : function(allAttrs) {
            var attr, 
                attrs, 
                cfg, 
                val, 
                path, 
                i, 
                clone, 
                cfgProps = Base._ATTR_CFG,
                aggAttrs = {};

            if (allAttrs) {
                for (i = allAttrs.length-1; i >= 0; --i) {
                    attrs = allAttrs[i];

                    for (attr in attrs) {
                        if (attrs.hasOwnProperty(attr)) {

                            // Protect config passed in
                            cfg = Y.mix({}, attrs[attr], true, cfgProps);

                            val = cfg.value;
                            clone = cfg.cloneDefaultValue;

                            if (val) {
                                if ( (clone === undefined && (OBJECT_CONSTRUCTOR === val.constructor || L.isArray(val))) || clone === DEEP || clone === true) {
                                    cfg.value = Y.clone(val);
                                } else if (clone === SHALLOW) {
                                    cfg.value = Y.merge(val);
                                }
                                // else if (clone === false), don't clone the static default value. 
                                // It's intended to be used by reference.
                            }

                            path = null;
                            if (attr.indexOf(DOT) !== -1) {
                                path = attr.split(DOT);
                                attr = path.shift();
                            }

                            if (path && aggAttrs[attr] && aggAttrs[attr].value) {
                                O.setValue(aggAttrs[attr].value, path, val);
                            } else if (!path){
                                if (!aggAttrs[attr]) {
                                    aggAttrs[attr] = cfg;
                                } else {
                                    Y.mix(aggAttrs[attr], cfg, true, cfgProps);
                                }
                            }
                        }
                    }
                }
            }

            return aggAttrs;
        },

        /**
         * Initializes the class hierarchy for the instance, which includes 
         * initializing attributes for each class defined in the class's 
         * static <a href="#property_Base.ATTRS">ATTRS</a> property and 
         * invoking the initializer method on the prototype of each class in the hierarchy.
         *
         * @method _initHierarchy
         * @param {Object} userVals Object with configuration property name/value pairs
         * @private
         */
        _initHierarchy : function(userVals) {
            var lazy = this._lazyAddAttrs,
                constr,
                constrProto,
                ci,
                ei,
                el,
                classes = this._getClasses(),
                attrCfgs = this._getAttrCfgs();

            for (ci = classes.length-1; ci >= 0; ci--) {

                constr = classes[ci];
                constrProto = constr.prototype;

                if (constr._yuibuild && constr._yuibuild.exts && !constr._yuibuild.dynamic) {
                    for (ei = 0, el = constr._yuibuild.exts.length; ei < el; ei++) {
                        constr._yuibuild.exts[ei].apply(this, arguments);
                    }
                }

                this.addAttrs(this._filterAttrCfgs(constr, attrCfgs), userVals, lazy);

                if (constrProto.hasOwnProperty(INITIALIZER)) {
                    constrProto.initializer.apply(this, arguments);
                }
            }
        },

        /**
         * Destroys the class hierarchy for this instance by invoking
         * the descructor method on the prototype of each class in the hierarchy.
         *
         * @method _destroyHierarchy
         * @private
         */
        _destroyHierarchy : function() {
            var constr,
                constrProto,
                ci, cl,
                classes = this._getClasses();

            for (ci = 0, cl = classes.length; ci < cl; ci++) {
                constr = classes[ci];
                constrProto = constr.prototype;
                if (constrProto.hasOwnProperty(DESTRUCTOR)) {
                    constrProto.destructor.apply(this, arguments);
                }
            }
        },

        /**
         * Default toString implementation. Provides the constructor NAME
         * and the instance ID.
         *
         * @method toString
         * @return {String} String representation for this object
         */
        toString: function() {
            return this.constructor.NAME + "[" + Y.stamp(this) + "]";
        }
    };

    // Straightup augment, no wrapper functions
    Y.mix(Base, Y.Attribute, false, null, 1);
    Y.mix(Base, PluginHost, false, null, 1);

    /**
     * Alias for <a href="Plugin.Host.html#method_Plugin.Host.plug">Plugin.Host.plug</a>. See aliased 
     * method for argument and return value details.
     *
     * @method Base.plug
     * @static
     */
    Base.plug = PluginHost.plug;

    /**
     * Alias for <a href="Plugin.Host.html#method_Plugin.Host.unplug">Plugin.Host.unplug</a>. See the 
     * aliased method for argument and return value details.
     *
     * @method Base.unplug
     * @static
     */
    Base.unplug = PluginHost.unplug;

    // Fix constructor
    Base.prototype.constructor = Base;

    Y.Base = Base;



}, '@VERSION@' ,{requires:['attribute']});
