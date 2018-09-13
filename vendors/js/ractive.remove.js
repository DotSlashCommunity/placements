// Removes array element, heavily based on
// https://github.com/ractivejs/ractive/issues/1649#issuecomment-228332282
Ractive.prototype.remove = function(keypath){                
    var parent = '',
        property = keypath,
        lastDot = keypath.lastIndexOf( '.' );

    parent = keypath.substr( 0, lastDot );
    property = keypath.substring( lastDot + 1 );             

    this.splice(parent, parseInt(property), 1);
}
