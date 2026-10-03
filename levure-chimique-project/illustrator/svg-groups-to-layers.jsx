// Illustrator opens an SVG as groups inside a single layer. This turns every top-level group of
// the open document into a layer with the same name (Background, Title_FR, Nutrition_table...),
// keeps the stacking order, and makes GUIDES_do_not_print a locked, non-printing layer.
// Run it with File > Scripts > Other Script... on a freshly opened face SVG.
(function () {
    if (app.documents.length === 0) {
        alert("Open one of the face SVGs first.");
        return;
    }
    var doc = app.activeDocument;
    var host = doc.layers[0];

    function topGroups(container) {
        var out = [];
        for (var i = 0; i < container.pageItems.length; i++) {
            var it = container.pageItems[i];
            if (it.parent === container) out.push(it);
        }
        return out;
    }

    var items = topGroups(host);
    // some Illustrator versions wrap the whole import in one group: look inside it
    if (items.length === 1 && items[0].typename === "GroupItem") items = topGroups(items[0]);

    var made = 0;
    // bottom-most first: each new layer is added on top, so the order is preserved
    for (var j = items.length - 1; j >= 0; j--) {
        var g = items[j];
        var lyr = doc.layers.add();
        lyr.name = g.name ? g.name : "Layer " + (items.length - j);
        if (g.typename === "GroupItem" && !g.clipped) {
            // move the group's children into the layer so the layer replaces the group
            var kids = [];
            for (var k = 0; k < g.pageItems.length; k++) kids.push(g.pageItems[k]);
            for (var m = kids.length - 1; m >= 0; m--) kids[m].move(lyr, ElementPlacement.PLACEATBEGINNING);
            g.remove();
        } else {
            g.move(lyr, ElementPlacement.PLACEATBEGINNING);
        }
        if (/GUIDES/i.test(lyr.name)) {
            lyr.printable = false;
            lyr.locked = true;
        }
        made++;
    }

    if (host.pageItems.length === 0 && host.layers.length === 0) host.remove();
    alert(made + " layers created.");
})();
