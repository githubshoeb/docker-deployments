global.amqp = require('amqp');
var io = require('socket.io').listen(40000);
//io.set('transports', ['xhr-polling']);

/*
 * Module global variables
*/
global.amqpReady = 0;

//holder for active client sockets
var queueStack = new Object();

/*
* RabbitMQ connection
*/
console.log("connecting to RabbitMQ");
global.connection = global.amqp.createConnection({
    host: "rabbitmq",
    port:5672,
    login: "guest",
    password: "guest"
});

if(global.connection!= undefined) {
	console.log("Error connecting amqp");
}
//add this for better debuging
global.connection.on('error', function(e) {
  console.log("Error from amqp: ", e);
});

global.connection.on('ready', 
    function () {
        console.log("RabbitMQ connection stablished");
        global.amqpReady = 1;
    }
);


/*
* Web-Socket declaration
*/ 
io.sockets.on('connection', function (clientSocket) {
    //two queues created per session
    var socket = clientSocket;
    socket.on('message', function (subscriptionInfo) {
        var data;
        try{
            data = JSON.parse(subscriptionInfo);
        }catch(error){
            socket.emit("message", JSON.stringify({
                "error": "invalid_params", 
                "code": 400
            }));
        }           
        if(data!= undefined) {
            (function (data){
                var viewInfo=data;
                var q=null;
                var routingKey=null;
                var viewName = null;
                var exchange = null;
                var queueName = null;
                console.log('View Info: '+JSON.stringify(data));
                try{                      
		              exchange = global.connection.exchange("com.es.topic", {
                        type:'topic',
                        passive:true
                        });
                    console.log("---- declare queue");
                    var timestamp=new Date().getTime();
                    viewName = data['view'];
                    if(data['view']=="temp"){
                        queueName = data['userId']+':'+timestamp+":"+data['view'];
                    }else{
                        queueName = data['userId']+':'+data['customerId']+':'+timestamp+":"+data['view'];
                    }
                    q = global.connection.queue(queueName,{
                        durable:false,
                        exclusive:false,
                        autoDelete: true
                    },
                    function (metaInfo){
				        var counter=0;
                        var data=viewInfo;
                        console.log(data);
                        if(data['view']=="temp"){
                            routingKey=data['userId'];
                        }else if(data['view']=="profile"){
                            
                            routingKey=data['customerId']+'.'+data['view']+'.'+data['channel']+'.'+'*'+'.'+'*';
                        }else{
                            routingKey=data['customerId']+'.'+data['view']+'.'+data['channel']+'.'+data['profileId']; 
                        }
                        console.log("---- routing key:"+routingKey);
                        
                        console.log("---- bind queue to exchange");
                        q.bind('com.es.topic', routingKey);
                        
                        console.log("---- subscribing queue exchange");
                        socketObj=q.subscribe(function (message) {
							socket.emit("message", message);
				        });     
                        console.log("---- Adding callback queue subscription");
                        socketObj.addCallback(function(ok) {
                            console.log(ok.consumerTag);
                            var consumerTag=ok.consumerTag;
                            queueStack[consumerTag]={
                                "q":q,
                                "exchange":exchange,
                                "rk":routingKey,
                                "view":viewName
                            };
                            socket.emit("consumerTag",{"view":viewName,"consumerTag":consumerTag});
                        });
                        
                        
                    }
                    );
                }catch(err){
                    console.log("Imposible to connection to rabbitMQ-server");
                }                                   

            })(data);          
        }
        else {
            socket.emit("message", JSON.stringify({
                "error": "invalid_token", 
                "code": 401
            }));
        }

    });
    
    socket.on('unsubscribe',function(consumerTag){
        
        if(consumerTag){
            var consumerTag=JSON.parse(consumerTag);
            console.log("unsubscribe consumerTag----->"+consumerTag['consumerTag']);
            if(consumerTag['consumerTag']){
                var viewTag=consumerTag['consumerTag'];
                if(queueStack.hasOwnProperty(viewTag)){
                    console.log('unsubscribing'+queueStack[viewTag]);
                    var queue=queueStack[viewTag]['q'];
                    var rk=queueStack[viewTag]['rk'];
                    var exchange=queueStack[viewTag]['exchange'];
                    var view=queueStack[viewTag]['view'] 
                    queue.unbind(exchange,rk);
                    queue.unsubscribe(viewTag);
                    queue.destroy();
                    delete queueStack[viewTag];
                    console.log('unsubscribed view consumerTag -------------------------------------->'+viewTag);
                }
            }
        }
    });
    
    socket.on('disconnect', function () {
        console.log("closing socket");
    });
});
