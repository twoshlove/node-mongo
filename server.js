const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const methodOverride = require('method-override')
require('dotenv').config()



app.use(bodyParser.urlencoded({extended: true}))
app.use(methodOverride('_method'))

app.set('view engine', 'ejs')

app.use('/public', express.static('public'))

let db;
MongoClient.connect(process.env.DB_URL, {useUnifiedTopology:true}, (error, client) => {
	if(error) return console.log(error)
	db = client.db('todoapp')
	app.listen(process.env.PORT, () => {
		console.log('listening on 8080')
	})
})

app.get('/', (req, res) => {
	res.render('index.ejs')
})

app.get('/write', (req, res) => {
	res.render('write.ejs')
})

app.post('/add', (req, res) => {
	db.collection('counter').findOne({name: '게시물갯수'}, (error, result) => {
		const data = {
			_id: result.totalPost + 1,
			title: req.body.title,
			date: req.body.date
		}
		db.collection('post').insertOne({...data}, (error, result) => {
			if(error) return console.log(error)
			db.collection('counter').updateOne({name: '게시물갯수'}, {$inc: {totalPost: 1}}, () => {
				res.send('전송 완료')
			})
		})
	})
})

app.get('/list', (req, res) => {
	db.collection('post').find().toArray((error, result) => {
		res.render('list.ejs', {posts: result})
	})
})

app.get('/search', (req, res) => {
	console.log(req.query.value)
	const title = req.query.value

	const searchCondition = [
    {
      $search: {
        index: 'search',
        text: {
          query: title,
          path: 'title'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    }
  ]

	db.collection('post').aggregate(searchCondition).toArray((error, result) => {
		console.log(result)
		res.render('searchList.ejs', {posts: result})
	})
})

app.delete('/delete', (req, res) => {
	console.log(req.body)
	const data = {
		_id: parseInt(req.body._id)
	}

	db.collection('post').deleteOne(data, (error, result) => {
		if(error) return res.status(400).send({message: '실패했습니다.'})
		res.status(200).send({message: '성공했습니다.'})
	})
})

app.get('/detail/:id', (req, res) => {
	const id = parseInt(req.params.id)

	db.collection('post').findOne({_id: id}, (error, result) => {
		console.log(result)
		res.render('detail.ejs', {data: result})
	})
})

app.get('/edit/:id', (req, res) => {
	const id = parseInt(req.params.id)

	db.collection('post').findOne({_id: id}, (error, result) => {
		console.log(result)
		res.render('edit.ejs', {data: result})
	})
})

app.put('/edit', (req, res) => {
	const id = parseInt(req.body.id)
	const data = {
		title: req.body.title,
		date: req.body.date
	}
		
	db.collection('post').updateOne({_id: id}, {$set: {...data}}, (error, result) => {
		res.redirect('/list')
	})
})


const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')

app.use(session({secret: '비밀코드', resave: true, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())

app.get('/fail', (req, res) => {
	res.render('fail.ejs')
})

app.get('/mypage', checkLogin, (req, res) => {
	console.log(req.user)
	res.render('mypage.ejs', {user: req.user})
})

function checkLogin(req, res, next){
	if(req.user){
		next()
	}else{
		res.send('로그인 안했습니다.')
	}
}

app.get('/login', (req, res) => {
	res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {
	failureRedirect: '/fail'
}), (req, res) => {
	res.redirect('/mypage')
})

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러)

    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}))

passport.serializeUser((user, done) => {
	done(null, user.id)
})

passport.deserializeUser((id, done) => {
	db.collection('login').findOne({id: id}, (error, result) => {
		done(null, result)
	})
})

