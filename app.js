require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const app = express();
const session = require('express-session');
import { prismaClient } from "src/prisma.client";


// console.log("MYSQL_HOST:", process.env.MYSQL_HOST);
// console.log("MYSQL_USER:", process.env.MYSQL_USER);

app.listen(8778 , () =>{
    console.log("app berjalan di port 8778")
})

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: "4nakpadan7",
    resave: true, 
    saveUninitialized: true, 
    cookie: { secure: false , httpOnly : true} // Set secure ke true jika menggunakan HTTPS
}));



// const connection = mysql.createConnection({
//    host: process.env.MYSQL_HOST,
//     user: process.env.MYSQL_USER,
//     password: process.env.MYSQL_PASSWORD,
//     database: process.env.MYSQL_DB,
//     port: process.env.MYSQL_PORT
// });

// connection.connect(err => {
//   if (err) {
//     console.log(err);
//   }
//   else {
//   console.log('Connected to database');
//   }
// });

//middleware
const cekLogin = (req,res,next) => {
  if(req.session.id_pengguna && req.session){
    next();
  }else{
    // res.send('<script>alert("Pesan dari server!"); window.location.href="/";</script>');
    res.status(401).send("Unauthorized");
  }
}

const cekRegist = (req,res,next) => {
    connection.query(`select*from user` , (err,result) =>{
      for(i=0;i<result.length;i++){
          if(req.body.username === result[i].email){
           return res.redirect('/regist?messageRegist=true');
          }
      }
      next();
    })

    
}

//routing

app.post('/registrasi',cekRegist,(req,res) => {
    const table = "user";
    const email = req.body.username;
    const nama = req.body.nama;
    const password = req.body.password;
    var sql = `INSERT INTO user (nama,email,password) VALUES ('${nama}','${email}','${password}')`

    if(email && password && nama){
        connection.query(sql,(err,result) => {
        try {
            if(result) {
                console.log(`user ${nama} dibuat`)
                res.redirect("/login?message=true")
            } else{
                res.send(err);
            }
            
        } catch (err) {
            console.log(err);
            res.status(500);
        }
    })
    }else{
        res.send('input dulu yg bener woy semuanya')
    }

    
})


app.get('/login' , (req,res) => {
    req.session.destroy((err) => {
      if(err){
        console.log('erro gara gara ' + err)
      }
    });
      const statusRegist = req.query.message;
    res.render('login' , {message : statusRegist , message2 : req.query.messageErr});
});

app.post('/login',async (req,res) => {
    const table = "user";
    const email = req.body.username;
    const password = req.body.password;
    var sql = `SELECT * FROM ${table} WHERE email="${email}" and password="${password}"`;

    const logon = await prismaClient.user.findMany({
        where : {
            AND : [
              {email : email},
              {password : password}
            ]
        }
    })
    


    // connection.query(sql,(err,result) => {
    //     try {
    //         if(result.length>0) {
    //             console.log(`user ${email} login`)
    //             req.session.email = result[0].email;
    //             req.session.nama=result[0].nama;
    //             req.session.id_pengguna = result[0].id
    //             console.log(req.session.id_pengguna)
    //            res.redirect(`/`)
               


    //         } else{
    //             res.redirect('/login?messageErr=true')
    //         }
            
    //     } catch (err) {
    //         res.status(500)
    //     }
    // })
})


app.post("/", (req, res) => {
  const table = "entry";
  const name = req.body.user_name;
  const email = req.body.user_email;
  const message = req.body.user_message;
  var sql = `INSERT INTO ${table} VALUES ("${name}","${email}", "${message}");`;

  connection.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      req.status(500);
    } else {
      console.log("1 record inserted");
    }
  });

  return res.redirect("/");
});

const daysAgo = (tanggal) => {
  const tanggal_db = new Date(tanggal);
  const today = new Date();

  const jarak = today - tanggal_db;
  const hasil = Math.floor(jarak/(1000*60*60*24));

  return hasil === 0 ? "Today" : `${hasil} days ago`;
}

app.get("/messages", (req, res) => {
  var search = req.query.pencarian;
  var search2 = req.query.id;
  var sql = `SELECT * FROM entry WHERE id_tiket REGEXP ? OR urgensi REGEXP ? OR no_telp REGEXP ? OR  kategori REGEXP ? OR nama REGEXP ? OR email REGEXP ? OR isi REGEXP ?`;

  connection.query(sql, [search, search, search, search, search, search, search], (err, result) => {
    if (err) {
        console.error("Error Query 1:", err);
        return res.status(500).send("Terjadi kesalahan" , err);
    }

    if (result.length > 0) {
        return res.render('cekTiket', { data: result, daysAgo, user: req.session.nama });
    }

    connection.query(`SELECT * FROM entry WHERE id_pengirim = ?`, [search2], (err, result2) => {
        if (err) {
            console.error("Error Query 2:", err);
            return res.status(500).send("Terjadi kesalahan");
        }

        if (result2.length > 0) {
            return res.render('cekTiket', { data: result2, daysAgo, user: req.session.nama });
        } else {
            return res.redirect('/?messageErr=true');
        }
    });
});

});

app.get('/regist' ,(req,res) => {
    res.render('registrasi' ,  { message: req.query.messageRegist || 'false' })
})


app.get('/' , (req,res) =>{
    user1 = req.session.nama;
    res.render("home" , {messageErrr : req.query.messageErr,message : req.query.messageAdd,user : user1,name : req.session.nama,email : req.session.email , id_pengguna : req.session.id_pengguna});
})

app.post('/search',(req,res) => {
  var search = req.body.pencarian;
  var sql = `SELECT * FROM entry WHERE id_tiket REGEXP ? OR urgensi REGEXP ? OR no_telp REGEXP ? OR  kategori REGEXP ? OR nama REGEXP ? OR email REGEXP ? OR isi REGEXP ?`;

  connection.query(sql,[search,search,search,search,search,search,search],(err,result) => {
    if(result){
      res.json(result);
      console.log(result);
    }else{res.send("ga ada");res.status(500)};
  })
})

app.post("/add", cekLogin,(req, res) => {
  const table = "entry";
  const name = req.body.nama;
  const judul = req.body.judul;
  const urgensi = req.body.urgensi;
  const kategori = req.body.kategori;
  const email = req.body.email;
  const nomor_telp = req.body.noTelp;
  const isi = req.body.isi;

  var sql = `INSERT INTO entry (nama, email, no_telp, judul, kategori, urgensi, isi,id_pengirim) VALUES ('${name}','${email}','${nomor_telp}','${judul}','${kategori}','${urgensi}','${isi}',${req.session.id_pengguna})`;

  connection.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500);
    } else {
      console.log("1 record inserted");
    }
  });

  return res.redirect(`/?messageAdd=true`);
});

app.get("/check-session", (req, res) => {
    console.log("Session Data:", req.session); // Debug sesi
    res.json(req.session);
});


app.get('/tiket' , (req,res) => {
  connection.query(`select*from entry where id_tiket = ${req.query.id}` , (err,result) => {
    if(result){
      connection.query(`select*from reply where id_tiket = ${req.query.id}` ,(err,result2) => {
        if(result2){
          res.render("tiket" , {user : req.session.nama , resultTiket : result , balasan : result2});
        }
      })
    }else{
      console.log(err)
    }
  })
  
})

app.get('/logout', (req,res) => {
  req.session.destroy((err) => {
    if (err) {
        console.error("Gagal menghapus session:", err);
    } else {
        res.redirect('/')
    }
});
})

app.get('/notif' , (req,res) => {
  res.render('notif')
})

app.get('/pembayaran' , (req,res) => {
  nomor_pembayaran = req.query.nompem;

  connection.query(`update transakasi_tb set status='Selesai',Uang = harga_akhir where id = ?` ,[nomor_pembayaran], (err,result) => {
    if(result){
     res.status(500).send("Pembayaran Selesai Silahkan Cek Kembali Menu Pembayaran.")
    }else{
      console.log(err);
    }
  })

})



