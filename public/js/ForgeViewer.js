var viewer;

// @urn the model to show
// @viewablesId which viewables to show, applies to BIM 360 Plans folder
function launchViewer(urn, viewableId) {
  var options = {
    env: 'AutodeskProduction',
    getAccessToken: getForgeToken,
    api: 'derivativeV2' + (atob(urn.replace('_', '/')).indexOf('emea') > -1 ? '_EU' : '') // handle BIM 360 US and EU regions
  };

  Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), { extensions: [ 'Autodesk.DocumentBrowser', 'HandleSelectionExtension', 'NestedViewerExtension', 'Autodesk.Edit2D', 'Autodesk.ADN.Viewing.Extension.TransformTool', 'wp', 'MyAwesomeExtension', 'CameraRotation'] });
    viewer.start();
    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function () {
      viewer.utilities.fitToView();
    });
    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
  });

  function onDocumentLoadSuccess(doc) {
    // if a viewableId was specified, load that view, otherwise the default view
    var viewables = (viewableId ? doc.getRoot().findByGuid(viewableId) : doc.getRoot().getDefaultGeometry());
    viewer.loadDocumentNode(doc, viewables).then(i => {
      // any additional action here?
      viewer.loadExtension("NestedViewerExtension",  { filter: ["2d", "3d"], crossSelection: true })
      viewer.loadExtension("Autodesk.ADN.Viewing.Extension.TransformTool")
      viewer.loadExtension("Autodesk.Edit2D")
      viewer.loadExtension('Autodesk.ADN.Viewing.Extension.ScreenShotManager',{createControls: true})
      viewer.loadExtension('CameraRotation')
      viewer.loadExtension('MyAwesomeExtension')
      viewer.loadExtension('wp')
      viewer.loadExtension('Autodesk.BimWalk')
      viewer.loadExtension('Autodesk.FullScreen')
      viewer.loadExtension('Autodesk.ViewerSettings')
      viewer.loadExtension('Autodesk.Viewing.Popout')
      viewer.loadExtension('Autodesk.Section')
      viewer.loadExtension('Autodesk.Measure')
    });
  }

  function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
  }
}

var $container = $(viewer.container);

Autodesk.Viewing.Viewer3D.prototype.getScreenShot = function(w, h, cb) {
}

viewer.getScreenShot(
    $container.width(),
    $container.height(),
    function(newBlobURL){
        // use blobUrl ...
        screenshot.src = newBlobURL;
    });

function getForgeToken(callback) {
  fetch('/api/forge/oauth/token').then(res => {
    res.json().then(data => {
      callback(data.access_token, data.expires_in);
    });
  });
}

async function loadModel(viewer, urn, guid) {
  return new Promise(function (resolve, reject) {
      function onDocumentLoadSuccess(doc) {
          Autodesk.Viewing.Document.getAecModelData(doc.getRoot()).then(aec => console.log('AEC metadata', aec));
          resolve(viewer.loadDocumentNode(doc, doc.getRoot().findByGuid(guid)));
      }
      function onDocumentLoadFailure(code, message) {
          console.error('Could not load document.', message);
          reject(message);
      }
      Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
  });
}

function sheetToWorld(sheetPos, model2d, model3d) {
  const viewport = Autodesk.AEC.AecModelData.findViewportAtPoint(model2d, new THREE.Vector2(sheetPos.x, sheetPos.y));
  if (!viewport) {
      return null;
  }
  const sheetUnitScale = model2d.getUnitScale();
  const globalOffset = model3d.getData().globalOffset;
  const matrix = Autodesk.AEC.AecModelData.get2DTo3DMatrix(viewport, sheetUnitScale);
  const worldPos = sheetPos.clone().applyMatrix4(matrix).sub(globalOffset);
  return worldPos;
}


