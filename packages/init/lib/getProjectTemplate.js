const {request} = require('@imc-cli/utils')

function getProjectTemplate() {
    return request.get('/project/template')
}

module.exports = getProjectTemplate