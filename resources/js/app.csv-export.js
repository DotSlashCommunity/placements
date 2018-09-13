var csv = {
  generate: function(rows) {
    var csvContent = "data:text/csv;charset=utf-8,";

    rows.forEach(function(rowArray){
      var row = rowArray.join(",");
      csvContent += row + "\r\n";
    });

    return csvContent;
  },

  export: function(rows, filename) {
    var url = csv.generate(rows);

    var encodedUri = encodeURI(url);
    var link = document.createElement('a');

    if (typeof link.download === 'string') {
      link.href = encodedUri;
      link.download = filename + '.csv';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(encodedUri);
    }
  }
};
