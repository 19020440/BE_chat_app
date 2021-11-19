
   const getLessProfile = ([...data]) => {
    if(data.length == 0) return [];
    const result = data.map((value) => {
      const {isAdmin,status,password,socketId,...resData} = value._doc;
      console.log(resData);
      return resData;
    })

    return result;
  }


  module.exports = {getLessProfile};