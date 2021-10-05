const router = require("express").Router();
const AuthController = require('../controllers/AuthController')
const {authenicate} = require('../middlewares/authenicate')
//REGISTER
router.post("/register", AuthController.register);

//LOGIN
router.post("/login", AuthController.login);

//ValidLogin    
router.get("/valid",authenicate, AuthController.valid);

//LOgout
router.post('/logout', AuthController.logout)



module.exports = router;
