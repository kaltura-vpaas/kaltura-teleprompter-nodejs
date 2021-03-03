function postJax(url,data,success,error) {
    $.ajax({
        global: false,
        type: 'POST',
        url: url, 
        dataType: 'json',
        data: data,
        success: success,
        error: error
    });
}

function delJax(url,data,success,error) {
    $.ajax({
        global: false,
        type: 'DELETE',
        url: url, 
        dataType: 'json',
        data: data,
        success: success,
        error: error
    });
}

function getJax(url,success,error) {
    $.ajax({
        global: false,
        type: 'GET',
        url: url, 
        success: success,
        error: error
    });
}