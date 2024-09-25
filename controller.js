const randomRole = (roles) =>{
    const indexRandomRole = Math.floor(Math.random() * roles.length)
    const getRole = roles[indexRandomRole];
    roles.slice(getRole,1)
    return getRole;
}

module.exports = {randomRole}