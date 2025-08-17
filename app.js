
import { prismaClient } from './src/prisma-client.js'
import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import mysql from 'mysql2'
import session from 'express-session'
const app = express();
import path from 'path';
import { fileURLToPath } from 'url';
import { create } from 'domain'


// console.log("MYSQL_HOST:", process.env.MYSQL_HOST);
// console.log("MYSQL_USER:", process.env.MYSQL_USER);

app.listen(8778 , () =>{
    console.log("app berjalan di port 8778")
})

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: "4nakpadan7",
    resave: true, 
    saveUninitialized: true, 
    cookie: { secure: false , httpOnly : true} // Set secure ke true jika menggunakan HTTPS
}));



//middleware
const cekLogin = (req,res,next) => {
  if(req.session.id_pengguna && req.session){
    next();
  }else{
    // res.send('<script>alert("Pesan dari server!"); window.location.href="/";</script>');
    res.status(401).send("Unauthorized");
  }
}

//sebenernya middleware ini bisa gw atasin kalo pake unique di db tapi karena males gw konvert aja lah query nya ke prisma
const cekRegist = async(req,res,next) => {
   
    const result = await prismaClient.user.findMany({
      select : {
        email : true
      }
    })

    for(let i=0;i<result.length;i++){
          if(req.body.username === result[i].email){
           return res.redirect('/regist?messageRegist=true');
          }
      }

      next();



}

//routing

app.post('/registrasi',cekRegist,async(req,res) => {
    const table = "user";
    const email = req.body.username;
    const nama = req.body.nama;
    const password = req.body.password;
    

    if(email && password && nama){
      try {
        const registPrisma = await prismaClient.user.create({
        data : {
          email : email,
          nama : nama,
          password : password
        }
    });

    if(registPrisma){
        console.log(`user ${nama} dibuat`);
        res.redirect("/login?message=true");
    }

      } catch (e) {
        console.log('error : ' +e);
        res.status(500);
      }
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

    const logon = await prismaClient.user.findMany({
        where : {
           AND : [
            {
              email : email
            },
            {
              password : password
            }
           ]
        }
    })
    
    try{
      if(logon.length>0){
        const logonn = logon[0];
          console.info(`user ${logonn.email} telah login!`)
          req.session.email = logonn.email;
          req.session.nama = logonn.nama;
          req.session.id_pengguna = logonn.id;
          req.session.save(()=>{
            res.redirect('/');
          })
    
      }else{
        res.redirect('/login?messageErr=true')
      }
    } catch(err){
      res.status(500);
      console.log(err);
    }

})


app.post("/", async(req, res) => {
  const name = req.body.user_name;
  const email = req.body.user_email;
  const message = req.body.user_message;
  // var sql = `INSERT INTO ${table} VALUES ("${name}","${email}", "${message}");`;


  const createTiket = await prismaClient.entry.create({
      data : {
          nama : name,
          email : email,
          message : message
      }
  });

  return res.redirect('/');



});

const daysAgo = (tanggal) => {
  const tanggal_db = new Date(tanggal);
  const today = new Date();

  const jarak = today - tanggal_db;
  const hasil = Math.floor(jarak/(1000*60*60*24));

  return hasil === 0 ? "Today" : `${hasil} days ago`;
}

app.get("/messages", async(req, res) => {
  const search = req.query.pencarian;
  const search2 = parseInt(req.query.id, 10);
  // var sql = `SELECT * FROM entry WHERE id_tiket REGEXP ? OR urgensi REGEXP ? OR no_telp REGEXP ? OR  kategori REGEXP ? OR nama REGEXP ? OR email REGEXP ? OR isi REGEXP ?`;
  
  if(search){
 const prismaSearch = await prismaClient.entry.findMany({
    where : {
      OR : [
            {nama : {
              contains : search
            }},
            {urgensi : {
              contains : search
            }},
            {isi : {
              contains : search
            }},
            {kategori : {
              contains : search
            }},
            {judul : {
              contains : search
            }},
            {no_telp : {
              contains : search
            }},
            {email : {
              contains : search
            }}
        
      ]
    }
  });

    if (prismaSearch.length > 0) {
            return res.render('cekTiket', { data: prismaSearch, daysAgo, user: req.session.nama });
        } else {
            return res.redirect('/?messageErr=true');
        }

  }else if(search2){
      
      const prismaRes = await prismaClient.entry.findMany({
        where : {
          id_pengirim : search2
        }
      })

      if (prismaRes.length > 0) {
            return res.render('cekTiket', { data: prismaRes, daysAgo, user: req.session.nama });
        } else {
            return res.redirect('/?messageErr=true');
        }

  }

});

app.get('/regist' ,(req,res) => {
    res.render('registrasi' ,  { message: req.query.messageRegist || 'false' })
})


app.get('/' , (req,res) =>{
    const user1 = req.session.nama;
    res.render("home" , {messageErrr : req.query.messageErr,message : req.query.messageAdd,user : user1,name : req.session.nama,email : req.session.email , id_pengguna : req.session.id_pengguna});
})


app.post("/add", cekLogin,async(req, res) => {
  const table = "entry";
  const name = req.body.nama;
  const judul = req.body.judul;
  const urgensi = req.body.urgensi;
  const kategori = req.body.kategori;
  const email = req.body.email;
  const nomor_telp = req.body.noTelp;
  const isi = req.body.isi;

  var sql = `INSERT INTO entry (nama, email, no_telp, judul, kategori, urgensi, isi,id_pengirim) VALUES ('${name}','${email}','${nomor_telp}','${judul}','${kategori}','${urgensi}','${isi}',${req.session.id_pengguna})`;

 
  const createTiket = await prismaClient.entry.create({
      data : {
          nama : name,
          email : email,
          isi : isi,
          judul : judul,
          no_telp : nomor_telp,
          id_pengirim : req.session.id_pengguna,
          kategori : kategori,
          urgensi : urgensi
      },
      select : {
        id_tiket : true
      }
  });

  return res.redirect(`/?messageAdd=true`);
});

app.get("/check-session", (req, res) => {
    console.log("Session Data:", req.session); // Debug sesi
    res.json(req.session);
});


app.get('/tiket' , async(req,res) => {


  const tiketPrisma = await prismaClient.entry.findFirst({
    where : {
      id_tiket : parseInt(req.query.id,10)
    }
  })

  const replyPrisma = await prismaClient.reply.findMany({
     where : {
      id_tiket : parseInt(req.query.id,10)
     }
  })

  if(tiketPrisma && replyPrisma){
    res.render("tiket" , {user : req.session.nama , resultTiket : tiketPrisma , balasan : replyPrisma});
  }
  
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





