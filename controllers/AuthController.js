const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
module.exports  = new class AuthController {
    
    //LOGIN
    async login (req, res, next) {

            const {email, password} = req.body;

            try {
                const result = await User.find({email: email}).exec();
                !result && res.status(200).json({login: false, status: 0, content: "Username is not exist"});
                const validPassword = await bcrypt.compare(req.body.password, result[0].password)
                !validPassword && res.status(200).json({login: false, content: "Wrong password",status:0})
                const token = jwt.sign({email: result[0]._doc.email}, "secrettoken")
                const {password, ...dataResponse} = result[0]._doc;
                const updateStatus = await User.findOneAndUpdate({email}, {status: true});
                updateStatus &&  res.status(200).json({content: dataResponse,status: 1, token});
            } catch(err) {
                res.status(500).json(err);
            }

    }

    //REGISTER
    async register(req, res, next) {

            const { email } = req.body;

            try{
               const result = await User.findOne({email}).exec();
               result && res.status(200).json({status:0, content: "email is exist"});
               const salt = await bcrypt.genSalt(10);
               const hashedPassword = await bcrypt.hash(req.body.password, salt);
                const createuser = new User({...req.body, password: hashedPassword});
                const rs = await createuser.save();
                res.status(200).json({content: "Register Success !", status: 1});
            } catch(err) {
                res.status(500).json(err);
            }

    }

    //ValidLogin
    async valid(req, res, next) {
        try {
            const findUser = await User.find({email: req.email}).exec();
            !findUser && res.status(500).json({content: "email is not exist !", status: 0});
            const {coverPicture,...dataResponse} = findUser[0]._doc;
            const updateStatus = await User.findOneAndUpdate({email: req.email}, {status: true});
            updateStatus &&  res.status(200).json({content: dataResponse, status: 1});

        } catch(err) {
            res.status(500).json({content: "fail", status: 0})
        }
        
    }

    //LOGOUT
    async logout(req, res) {
        const {email} = req.body;
        try {
            const result = await User.find({email});
            !result && res.status(500).json({content: "Can not find user", status: 0});
            const updateStatus = await User.findOneAndUpdate({email}, {status: false});
            updateStatus &&  res.status(200).json({content: "updateStatus success !",status: 1});

        } catch(err) {
            res.status(500).json({content: err, status: 0});
        }
        
    }
}