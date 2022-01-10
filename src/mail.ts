import nodemailer from "nodemailer";

let testAccount;
let transporter;

async function setup()
{
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing
	testAccount = await nodemailer.createTestAccount();

	// create reusable transporter object using the default SMTP transport
	transporter = nodemailer.createTransport( {
		name   : "example.com",
		host   : "smtp.ethereal.email",
		port   : 587,
		secure : false, // true for 465, false for other ports
		auth   : {
			user : testAccount.user, // generated ethereal user
			pass : testAccount.pass, // generated ethereal password
		},
	} );
}

export async function send()
{
	if( !testAccount || !transporter ) await setup();

	// send mail with defined transport object
	const info = await transporter.sendMail( {
		from    : 'test@example.com', // sender address
		to      : "erotschkin.artur@gmail.com, kai.rickus@outlook.com", // list of receivers
		subject : "Is niiice", // Subject line
		text    : `Ist sehr nice, E-Mail-Versandt funktioniert.
		
		Gruß,
		Artur`, // plain text body
		html    : "<a href='https://google.com'>Bestätigungslink</a>", // html body
	} );

	debugger

	console.log( info );
}

// console.log( "Message sent: %s", info.messageId );
// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

// Preview only available when sending through an Ethereal account
// console.log( "Preview URL: %s", nodemailer.getTestMessageUrl( info ) );
// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...