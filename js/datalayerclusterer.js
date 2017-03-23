/* globals google */
/* exports DataLayerClusterer */
'use strict';

/**
 * @name DataLayerClusterer for Google Maps v3
 * @version version 0.7.2
 * @author Nelson Antunes
 *
 * The library creates and manages per-zoom-level clusters for large amounts of
 * data layer features.
 *
 * Based on MarkerClusterer by Luke Mehe.
 */

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * A Data Layer Clusterer that clusters point features.
 *
 * @param {google.maps.Map} map The Google map to attach to.
 * @param {Object=} opt_options support the following options:
 *	   'map': (google.maps.Map) The Google map to attach to.
 *     'gridSize': (number) The grid size of a cluster in pixels.
 *     'maxZoom': (number) The maximum zoom level that a feature can be part of a
 *                cluster.
 *     'zoomOnClick': (boolean) Whether the default behaviour of clicking on a
 *                    cluster is to zoom into it.
 *     'averageCenter': (boolean) Wether the center of each cluster should be
 *                      the average of all features in the cluster.
 *     'minimumClusterSize': (number) The minimum number of features to be in a
 *                           cluster before the features are hidden and a count
 *                           is shown.
 *     'styles': (object) An object that has style properties:
 *       'url': (string) The image url.
 *       'height': (number) The image height.
 *       'width': (number) The image width.
 *       'anchor': (Array) The anchor position of the label text.
 *       'textColor': (string) The text color.
 *       'textSize': (number) The text size.
 *       'backgroundPosition': (string) The position of the backgound x, y.
 * @constructor
 * @extends google.maps.OverlayView
 */
function DataLayerClusterer(opt_options) {
    DataLayerClusterer.extend(DataLayerClusterer, google.maps.OverlayView);

    /**
     *  @type {Array.<FeatureCluster>}
     */
    this.clusters_ = [];

    this.sizes = [53, 56, 66, 78, 90];

    /**
     * @private
     */
    this.styles_ = [];

    /**
     * @type {boolean}
     * @private
     */
    this.ready_ = false;

    var options = opt_options || {};

    var map = options.map || null;

    this.gridSize_ = options.gridSize || 60;
    this.minClusterSize_ = options.minimumClusterSize || 2;
    this.maxZoom_ = options.maxZoom || null;

    this.styles_ = options.styles || [];

    this.imagePath_ = options.imagePath || DataLayerClusterer.MARKER_CLUSTER_IMAGE_PATH_;
    this.imageExtension_ = options.imageExtension || DataLayerClusterer.MARKER_CLUSTER_IMAGE_EXTENSION_;

    this.zoomOnClick_ = true;
    if (options.zoomOnClick !== undefined) {
        this.zoomOnClick_ = options.zoomOnClick;
    }

    this.averageCenter_ = true;
    if (options.averageCenter !== undefined) {
        this.averageCenter_ = options.averageCenter;
    }

    this.setupStyles_();

    this._data_layer = new google.maps.Data();
    this._data_layer.setStyle(DataLayerClusterer.HIDDEN_FEATURE);

    if(map !== null) {
	    this.setMap(this.map_);
    }
}

/* ---- Constants ---- */

DataLayerClusterer.VISIBLE_FEATURE = {
    visible: true
};

DataLayerClusterer.HIDDEN_FEATURE = {
    visible: false
};


/* ---- Public methods ---- */

/**
 * Returns the number of clusters in the clusterer.
 *
 * @return {number} The number of clusters.
 */
DataLayerClusterer.prototype.getTotalClusters = function() {
    return this.clusters_.length;
};

/**
 * Extends a bounds object by the grid size.
 *
 * @param {google.maps.LatLngBounds} bounds The bounds to extend.
 * @return {google.maps.LatLngBounds} The extended bounds.
 */
DataLayerClusterer.prototype.getExtendedBounds = function(bounds) {
    var projection = this.getProjection();

    // Turn the bounds into latlng.
    var tr = new google.maps.LatLng(bounds.getNorthEast().lat(),
        bounds.getNorthEast().lng());
    var bl = new google.maps.LatLng(bounds.getSouthWest().lat(),
        bounds.getSouthWest().lng());

    // Convert the points to pixels and the extend out by the grid size.
    var trPix = projection.fromLatLngToDivPixel(tr);
    trPix.x += this.gridSize_;
    trPix.y -= this.gridSize_;

    var blPix = projection.fromLatLngToDivPixel(bl);
    blPix.x -= this.gridSize_;
    blPix.y += this.gridSize_;

    // Convert the pixel points back to LatLng
    var ne = projection.fromDivPixelToLatLng(trPix);
    var sw = projection.fromDivPixelToLatLng(blPix);

    // Extend the bounds to contain the new bounds.
    bounds.extend(ne);
    bounds.extend(sw);

    return bounds;
};

/**
 * Redraws the clusters.
 */
DataLayerClusterer.prototype.redraw = function() {
    var oldClusters = this.clusters_.slice();
    this.clusters_.length = 0;

    this.createClusters_();

    // Remove the old clusters.
    // Do it in a timeout so the other clusters have been drawn first.
    window.requestAnimationFrame(function() {
        var old_size = oldClusters.length;
        for (var i = 0; i !== old_size; ++i) {
            oldClusters[i].remove();
        }
    });
};


/* ---- Options GET & SET ---- */

/**
 * Whether zoom on click is set.
 *
 * @return {boolean} True if zoomOnClick_ is set.
 */
DataLayerClusterer.prototype.isZoomOnClick = function() {
    return this.zoomOnClick_;
};

/**
 * Whether average center is set.
 *
 * @return {boolean} True if averageCenter_ is set.
 */
DataLayerClusterer.prototype.isAverageCenter = function() {
    return this.averageCenter_;
};

/**
 *  Sets the max zoom for the clusterer.
 *
 *  @param {number} maxZoom The max zoom level.
 */
DataLayerClusterer.prototype.setMaxZoom = function(maxZoom) {
    this.maxZoom_ = maxZoom;
};

/**
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
DataLayerClusterer.prototype.getMaxZoom = function() {
    return this.maxZoom_;
};

/**
 * Returns the size of the grid.
 *
 * @return {number} The grid size.
 */
DataLayerClusterer.prototype.getGridSize = function() {
    return this.gridSize_;
};

/**
 * Sets the size of the grid.
 *
 * @param {number} size The grid size.
 */
DataLayerClusterer.prototype.setGridSize = function(size) {
    this.gridSize_ = size;
};

/**
 * Returns the min cluster size.
 *
 * @return {number} The grid size.
 */
DataLayerClusterer.prototype.getMinClusterSize = function() {
    return this.minClusterSize_;
};

/**
 * Sets the min cluster size.
 *
 * @param {number} size The grid size.
 */
DataLayerClusterer.prototype.setMinClusterSize = function(size) {
    this.minClusterSize_ = size;
};


/* ---- google.maps.Data interface ---- */

DataLayerClusterer.prototype.add = function(feature) {
    return this._data_layer.add(feature);
};

DataLayerClusterer.prototype.addGeoJson = function(geoJson, options) {
    return this._data_layer.addGeoJson(geoJson, options);
};

DataLayerClusterer.prototype.contains = function(feature) {
    return this._data_layer.contains(feature);
};

DataLayerClusterer.prototype.forEach = function(callback) {
    return this._data_layer.forEach(callback);
};

DataLayerClusterer.prototype.getControlPosition = function() {
    return this._data_layer.getControlPosition();
};

DataLayerClusterer.prototype.getControls = function() {
    return this._data_layer.getControls();
};

DataLayerClusterer.prototype.getDrawingMode = function() {
    return this._data_layer.getDrawingMode();
};

DataLayerClusterer.prototype.getFeatureById = function(id) {
    return this._data_layer.getFeatureById(id);
};

DataLayerClusterer.prototype.getStyle = function() {
    return this._data_layer.getStyle();
};

DataLayerClusterer.prototype.loadGeoJson = function(url, options, callback) {
    return this._data_layer.loadGeoJson(url, options, callback);
};

DataLayerClusterer.prototype.overrideStyle = function(feature, style) {
    return this._data_layer.overrideStyle(feature, style);
};

DataLayerClusterer.prototype.remove = function(feature) {
    return this._data_layer.remove(feature);
};

DataLayerClusterer.prototype.revertStyle = function(feature) {
    return this._data_layer.revertStyle(feature);
};

DataLayerClusterer.prototype.setControlPosition = function(controlPosition) {
    return this._data_layer.setControlPosition(controlPosition);
};

DataLayerClusterer.prototype.setControls = function(controls) {
    return this._data_layer.setControls(controls);
};

DataLayerClusterer.prototype.setDrawingMode = function(drawingMode) {
    return this._data_layer.setDrawingMode(drawingMode);
};

DataLayerClusterer.prototype.setStyle = function(style) {
    return this._data_layer.setStyle(style);
};

DataLayerClusterer.prototype.toGeoJson = function(callback) {
    return this._data_layer.toGeoJson(callback);
};


/* ---- Private methods ---- */

DataLayerClusterer.prototype.resetViewport = function() {
    // Remove all the clusters
    var c_size = this.clusters_.length;
    for (var i = 0; i !== c_size; ++i) {
        this.clusters_[i].remove();
    }

    this.clusters_ = [];
};

/**
 * Sets the clusterer's ready state.
 *
 * @param {boolean} ready The state.
 * @private
 */
DataLayerClusterer.prototype.setReady_ = function(ready) {
    if (!this.ready_) {
        this.ready_ = ready;
        this.createClusters_();
    }
};

/**
 * Determines if a feature is contained in a bounds.
 *
 * @param {google.maps.Data.Feature} feature The feature to check.
 * @param {google.maps.LatLngBounds} bounds The bounds to check against.
 * @return {boolean} True if the feature is in the bounds.
 * @private
 */
DataLayerClusterer.prototype.isFeatureInBounds_ = function(f, bounds) {
    return bounds.contains(f.getGeometry().get());
};

/**
 * Calculates the distance between two latlng locations in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @private
 */
DataLayerClusterer.prototype.distanceBetweenPoints_ = function(p1, p2) {
    if (!p1 || !p2) {
        return 0;
    }

    var R = 6371; // Radius of the Earth in km
    var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
    var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
};

/**
 * Add a feature to a cluster, or creates a new cluster.
 *
 * @param {google.maps.Data.Feature} feature The feature to add.
 * @private
 */
DataLayerClusterer.prototype.addToClosestCluster_ = function(feature) {
    var distance = 40000; // Some large number

    var pos = feature.getGeometry().get();

	var cluster;

    var c_size = this.clusters_.length;
    for (var i = 0; i !== c_size; ++i) {
        var center = this.clusters_[i].getCenter();

        if (center) {
            var d = this.distanceBetweenPoints_(center, pos);
            if (d < distance) {
                distance = d;
                cluster = this.clusters_[i];
            }
        }
    }

    if (cluster && cluster.isFeatureInClusterBounds(feature)) {
        cluster.addFeature(feature);
    } else {
        cluster = new FeatureCluster(this);
        cluster.addFeature(feature);
        this.clusters_.push(cluster);
    }
};

/**
 * Creates the clusters.
 *
 * @private
 */
DataLayerClusterer.prototype.createClusters_ = function() {
    if (!this.ready_) {
        return;
    }

    var mapBounds = new google.maps.LatLngBounds(this.map_.getBounds().getSouthWest(),
        this.map_.getBounds().getNorthEast());
    var bounds = this.getExtendedBounds(mapBounds);

    var self = this;
    this.forEach(function(feature) {
        if (self.isFeatureInBounds_(feature, bounds)) {
            self.addToClosestCluster_(feature);
        }
    });
};


/* ---- google.maps.OverlayView interface methods ---- */

/**
 * Method called once after setMap() is called with a valid map.
 *
 * Adds the data layer to the map and setup the events listeners.
 */
DataLayerClusterer.prototype.onAdd = function() {
    var map = this.getMap();

    if (this.map_ !== map) {
        this.onRemove();
    }

    this.map_ = map;

    if (this.map_ !== null) {
        this._data_layer.setMap(this.map_);

        this.prevZoom_ = this.map_.getZoom();

        // Add the map event listeners
        var self = this;
        this._zoom_changed = google.maps.event.addListener(this.map_, 'zoom_changed', function() {
            var zoom = self.map_.getZoom();

            if (self.prevZoom_ !== zoom) {
                self.prevZoom_ = zoom;
                self.resetViewport();
            }
        });

        this._idle = google.maps.event.addListener(this.map_, 'idle', function() {
            self.redraw();
        });

        this.setReady_(true);
    } else {
        this.setReady_(false);
    }
};

/**
 * Method called once following a call to setMap(null).
 *
 * Removes the data layer from the map and cleans the events listeners.
 */
DataLayerClusterer.prototype.onRemove = function() {
    if (this.map_ !== null) {
        if (this._zoom_changed !== null) {
            try {
                this.map_.removeListener(this._zoom_changed);
            } catch (e) {}
        }

        if (this._idle !== null) {
            try {
                this.map_.removeListener(this._idle);
            } catch (e) {}
        }
    }

    this._data_layer.setMap(null);

    this.map_ = null;

    this.setReady_(false);
};

/**
 * Empty implementation of the interface method.
 */
DataLayerClusterer.prototype.draw = function() {};


/* ---- Utils ---- */

/**
 * Extends a objects prototype by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 */
DataLayerClusterer.extend = function(obj1, obj2) {
    return (function(object) {
        for (var property in object.prototype) {
            this.prototype[property] = object.prototype[property];
        }
        return this;
    }).apply(obj1, [obj2]);
};


/**
 * A cluster that contains features.
 *
 * @param {DataLayerClusterer} featureClusterer The featureclusterer that this
 *     cluster is associated with.
 * @constructor
 * @ignore
 */
function FeatureCluster(featureClusterer) {
    this.featureClusterer_ = featureClusterer;
    this.map_ = featureClusterer.getMap();

    this.minClusterSize_ = featureClusterer.getMinClusterSize();
    this.averageCenter_ = featureClusterer.isAverageCenter();

    this.center_ = null;
    this.features_ = [];

    this.bounds_ = null;

    this.clusterIcon_ = new FeatureClusterIcon(this, featureClusterer.getStyles(),
        featureClusterer.getGridSize());
}

/**
 * Determins if a feature is already added to the cluster.
 *
 * @param {google.maps.Data.Feature} feature The feature to check.
 * @return {boolean} True if the feature is already added.
 */
FeatureCluster.prototype.isFeatureAlreadyAdded = function(feature) {
    if (this.features_.indexOf) {
        return this.features_.indexOf(feature) !== -1;
    } else {
    	var f_size = this.features_.length;
        for (var i = 0; i !== f_size; ++i) {
            if (this.features_[i] === feature) {
                return true;
            }
        }
    }

    return false;
};


/**
 * Add a feature the cluster.
 *
 * @param {google.maps.Data.Feature} feature The feature to add.
 * @return {boolean} True if the feature was added.
 */
FeatureCluster.prototype.addFeature = function(feature) {
    if (this.isFeatureAlreadyAdded(feature)) {
        return false;
    }

    if (!this.center_) {
        this.center_ = feature.getGeometry().get();
        this.calculateBounds_();
    } else {
        if (this.averageCenter_) {
            var l = this.features_.length + 1;
            var lat = (this.center_.lat() * (l - 1) + feature.getGeometry().get().lat()) / l;
            var lng = (this.center_.lng() * (l - 1) + feature.getGeometry().get().lng()) / l;
            this.center_ = new google.maps.LatLng(lat, lng);
            this.calculateBounds_();
        }
    }

    this.features_.push(feature);

    var len = this.features_.length;
    if (len < this.minClusterSize_) {
        // Min cluster size not reached so show the feature.
        this.featureClusterer_.overrideStyle(feature, DataLayerClusterer.VISIBLE_FEATURE);
    }

    if (len === this.minClusterSize_) {
        // Hide the features that were showing.
        for (var i = 0; i < len; i++) {
            this.featureClusterer_.revertStyle(this.features_[i]);
        }
    }

    if (len >= this.minClusterSize_) {
        this.featureClusterer_.revertStyle(feature);
    }

    this.updateIcon();
    return true;
};

/**
 * Returns the feature clusterer that the cluster is associated with.
 *
 * @return {DataLayerClusterer} The associated feature clusterer.
 */
FeatureCluster.prototype.getDataLayerClusterer = function() {
    return this.featureClusterer_;
};

/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 */
FeatureCluster.prototype.getBounds = function() {
    var bounds = new google.maps.LatLngBounds(this.center_, this.center_);

	var f_size = this.features_.length;
    for (var i = 0; i !== f_size; ++i) {
        bounds.extend(this.features_[i].getGeometry().get());
    }

    return bounds;
};

/**
 * Removes the cluster
 */
FeatureCluster.prototype.remove = function() {
    this.clusterIcon_.remove();
    this.features_.length = 0;
    delete this.features_;
};

/**
 * Returns the size of the cluster.
 *
 * @return {number} The cluster size.
 */
FeatureCluster.prototype.getSize = function() {
    return this.features_.length;
};

/**
 * Returns the features of the cluster.
 *
 * @return {Array.<google.maps.Data.Feature>} The cluster's features.
 */
FeatureCluster.prototype.getFeatures = function() {
    return this.features_;
};

/**
 * Returns the center of the cluster.
 *
 * @return {google.maps.LatLng} The cluster center.
 */
FeatureCluster.prototype.getCenter = function() {
    return this.center_;
};


/**
 * Calculated the extended bounds of the cluster with the grid.
 *
 * @private
 */
FeatureCluster.prototype.calculateBounds_ = function() {
    var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
    this.bounds_ = this.featureClusterer_.getExtendedBounds(bounds);
};

/**
 * Determines if a feature lies in the clusters bounds.
 *
 * @param {google.maps.Data.Feature} feature The feature to check.
 * @return {boolean} True if the feature lies in the bounds.
 */
FeatureCluster.prototype.isFeatureInClusterBounds = function(feature) {
    return this.bounds_.contains(feature.getGeometry().get());
};

/**
 * Returns the map that the cluster is associated with.
 *
 * @return {google.maps.Map} The map.
 */
FeatureCluster.prototype.getMap = function() {
    return this.map_;
};

/**
 * Updates the cluster icon
 */
FeatureCluster.prototype.updateIcon = function() {
    var zoom = this.map_.getZoom();
    var mz = this.featureClusterer_.getMaxZoom();

    if (mz && zoom > mz) {
        // The zoom is greater than our max zoom so show all the features in cluster.
		var f_size = this.features_.length;
	    for (var i = 0; i !== f_size; ++i) {
            this.featureClusterer_.overrideStyle(this.features_[i], DataLayerClusterer.VISIBLE_FEATURE);
        }

        return;
    }

    if (this.features_.length < this.minClusterSize_) {
        // Min cluster size not yet reached.
        this.clusterIcon_.hide();
        return;
    }

    var numStyles = this.featureClusterer_.getStyles().length;
    var sums = this.featureClusterer_.getCalculator()(this.features_, numStyles);

    this.clusterIcon_.setSums(sums);

    this.clusterIcon_.setCenter(this.center_);
    this.clusterIcon_.show();
};


/**
 * A cluster icon
 *
 * @param {Cluster} cluster The cluster to be associated with.
 * @param {Object} styles An object that has style properties:
 *     'url': (string) The image url.
 *     'height': (number) The image height.
 *     'width': (number) The image width.
 *     'anchor': (Array) The anchor position of the label text.
 *     'textColor': (string) The text color.
 *     'textSize': (number) The text size.
 *     'backgroundPosition: (string) The background postition x, y.
 * @param {number=} opt_padding Optional padding to apply to the cluster icon.
 * @constructor
 * @extends google.maps.OverlayView
 */
function FeatureClusterIcon(cluster, styles, opt_padding) {
    DataLayerClusterer.extend(FeatureClusterIcon, google.maps.OverlayView);

    this.styles_ = styles;
    this.padding_ = opt_padding || 0;
    this.cluster_ = cluster;
    this.center_ = null;
    this.map_ = cluster.getMap();
    this.div_ = null;
    this.sums_ = null;
    this.visible_ = false;

    this.setMap(this.map_);
}


/* ---- Public methods ---- */

/**
 * Hide the icon.
 */
FeatureClusterIcon.prototype.hide = function() {
    if (this.div_) {
        this.div_.style.display = 'none';
    }
    this.visible_ = false;
};

/**
 * Position and show the icon.
 */
FeatureClusterIcon.prototype.show = function() {
    if (this.div_) {
        var pos = this.getPosFromLatLng_(this.center_);
        this.div_.style.cssText = this.createCss(pos);
        this.div_.style.display = '';
    }
    this.visible_ = true;
};

/**
 * Remove the icon from the map
 */
FeatureClusterIcon.prototype.remove = function() {
    this.setMap(null);
};

/**
 * Sets the center of the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
FeatureClusterIcon.prototype.setCenter = function(center) {
    this.center_ = center;
};


/* ---- google.maps.OverlayView interface methods ---- */

/**
 * Adding the cluster icon to the dom.
 * @ignore
 */
FeatureClusterIcon.prototype.onAdd = function() {
    this.div_ = document.createElement('DIV');
    if (this.visible_) {
        var pos = this.getPosFromLatLng_(this.center_);
        this.div_.style.cssText = this.createCss(pos);
        this.div_.innerHTML = this.sums_.text;
    }

    var panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(this.div_);

    var self = this;
    google.maps.event.addDomListener(this.div_, 'click', function() {
        self.triggerClusterClick();
    });
};

/**
 * Draw the icon.
 * @ignore
 */
FeatureClusterIcon.prototype.draw = function() {
    if (this.visible_) {
        var pos = this.getPosFromLatLng_(this.center_);
        this.div_.style.top = pos.y + 'px';
        this.div_.style.left = pos.x + 'px';
    }
};

/**
 * Implementation of the onRemove interface.
 * @ignore
 */
FeatureClusterIcon.prototype.onRemove = function() {
    if (this.div_ && this.div_.parentNode) {
        this.hide();
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    }
};


/* ---- Private methods ---- */

/**
 * Triggers the clusterclick event and zoom's if the option is set.
 */
FeatureClusterIcon.prototype.triggerClusterClick = function() {
    var featureClusterer = this.cluster_.getDataLayerClusterer();

    // Trigger the clusterclick event.
    google.maps.event.trigger(featureClusterer, 'clusterclick', this.cluster_);

    if (featureClusterer.isZoomOnClick()) {
        // Zoom into the cluster.
        this.map_.fitBounds(this.cluster_.getBounds());
    }
};

/**
 * Returns the position to place the div dending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 * @private
 */
FeatureClusterIcon.prototype.getPosFromLatLng_ = function(latlng) {
    var pos = this.getProjection().fromLatLngToDivPixel(latlng);
    pos.x -= parseInt(this.width_ / 2, 10);
    pos.y -= parseInt(this.height_ / 2, 10);
    return pos;
};

/**
 * Create the css text based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position.
 * @return {string} The css style text.
 */
FeatureClusterIcon.prototype.createCss = function(pos) {
    var style = [];
    style.push('background-image:url(' + this.url_ + ');');
    var backgroundPosition = this.backgroundPosition_ ? this.backgroundPosition_ : '0 0';
    style.push('background-position:' + backgroundPosition + ';');

    if (typeof this.anchor_ === 'object') {
        if (typeof this.anchor_[0] === 'number' && this.anchor_[0] > 0 &&
            this.anchor_[0] < this.height_) {
            style.push('height:' + (this.height_ - this.anchor_[0]) +
                'px; padding-top:' + this.anchor_[0] + 'px;');
        } else {
            style.push('height:' + this.height_ + 'px; line-height:' + this.height_ +
                'px;');
        }
        if (typeof this.anchor_[1] === 'number' && this.anchor_[1] > 0 &&
            this.anchor_[1] < this.width_) {
            style.push('width:' + (this.width_ - this.anchor_[1]) +
                'px; padding-left:' + this.anchor_[1] + 'px;');
        } else {
            style.push('width:' + this.width_ + 'px; text-align:center;');
        }
    } else {
        style.push('height:' + this.height_ + 'px; line-height:' +
            this.height_ + 'px; width:' + this.width_ + 'px; text-align:center;');
    }

    var txtColor = this.textColor_ ? this.textColor_ : 'black';
    var txtSize = this.textSize_ ? this.textSize_ : 11;

    style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
        pos.x + 'px; color:' + txtColor + '; position:absolute; font-size:' +
        txtSize + 'px; font-family:Arial,sans-serif; font-weight:bold');
    return style.join('');
};

/**
 * Sets the icon to the the styles.
 */
FeatureClusterIcon.prototype.useStyle = function() {
    var index = Math.max(0, this.sums_.index - 1);
    index = Math.min(this.styles_.length - 1, index);
    var style = this.styles_[index];
    this.url_ = style.url;
    this.height_ = style.height;
    this.width_ = style.width;
    this.textColor_ = style.textColor;
    this.anchor_ = style.anchor;
    this.textSize_ = style.textSize;
    this.backgroundPosition_ = style.backgroundPosition;
};

/**
 * Set the sums of the icon.
 *
 * @param {Object} sums The sums containing:
 *   'text': (string) The text to display in the icon.
 *   'index': (number) The style index of the icon.
 */
FeatureClusterIcon.prototype.setSums = function(sums) {
    this.sums_ = sums;
    this.text_ = sums.text;
    this.index_ = sums.index;
    if (this.div_) {
        this.div_.innerHTML = sums.text;
    }

    this.useStyle();
};


/* ---- To remove soon ---- */
/*
 * TODO: Allow the styling using a similar interface than google.map.Data.
 *       Use SVG icon by default, remove dependency of google-maps-utility-library-v3.googlecode.com.
 */

/**
 * The feature cluster image path.
 *
 * @type {string}
 */
DataLayerClusterer.MARKER_CLUSTER_IMAGE_PATH_ = '//google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/images/m';
DataLayerClusterer.MARKER_CLUSTER_IMAGE_EXTENSION_ = 'png';

/**
 * Sets up the styles object.
 *
 * @private
 */
DataLayerClusterer.prototype.setupStyles_ = function() {
    if (this.styles_.length) {
        return;
    }

    var s_sizes = this.sizes.length;
    for (var i = 0; i !== s_sizes; ++i) {
        this.styles_.push({
            url: this.imagePath_ + (i + 1) + '.' + this.imageExtension_,
            height: this.sizes[i],
            width: this.sizes[i]
        });
    }
};

/**
 *  Sets the styles.
 *
 *  @param {Object} styles The style to set.
 */
DataLayerClusterer.prototype.setStyles = function(styles) {
    this.styles_ = styles;
};

/**
 *  Gets the styles.
 *
 *  @return {Object} The styles object.
 */
DataLayerClusterer.prototype.getStyles = function() {
    return this.styles_;
};

/**
 * Set the calculator function.
 *
 * @param {function(Array, number)} calculator The function to set as the
 *     calculator. The function should return a object properties:
 *     'text' (string) and 'index' (number).
 *
 */
DataLayerClusterer.prototype.setCalculator = function(calculator) {
    this.calculator_ = calculator;
};

/**
 * Get the calculator function.
 *
 * @return {function(Array, number)} the calculator function.
 */
DataLayerClusterer.prototype.getCalculator = function() {
    return this.calculator_;
};

/**
 *  The function for calculating the cluster icon image.
 *
 *  @param {Array.<google.maps.Data.Feature>} features The features in the clusterer.
 *  @param {number} numStyles The number of styles available.
 *  @return {Object} A object properties: 'text' (string) and 'index' (number).
 *  @private
 */
DataLayerClusterer.prototype.calculator_ = function(features, numStyles) {
    var index = 0;
    var count = features.length;
    var dv = count;
    while (dv !== 0) {
        dv = parseInt(dv / 10, 10);
        index++;
    }

    index = Math.min(index, numStyles);
    return {
        text: count,
        index: index
    };
};