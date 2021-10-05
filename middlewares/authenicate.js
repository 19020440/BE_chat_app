const {verify} = require('jsonwebtoken');

const authenicate = async (req,res,next) => {
    const token = req.header('token');
    !token && res.status(500).json({status: 0, content:"You are not login"})
    try {
        const validToken = verify(token, "secrettoken");
        // res.status(200).json(validToken)
       if(validToken.email) {
           req.email = validToken.email;
           next();
       } else res.status(500).json({content: "You are not login", status: 0})

    } catch(err) {
        return res.json({login: false,  context: err,})
    }

}

module.exports = {authenicate};