const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const tokens = require('./tokens.json');

const SysLoad = require("sysload");
const load = new SysLoad();

const { spawn } = require('child_process');

var bot_state = 'none';
load.start();

function treat_output(message) {
    message = message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    message = message.slice(-1980);
    message = message.replace(/```/g, "'''");
    return message = "```console\n" + message + "```";
}

function execute(message, cmd, args) {
    var child = spawn(cmd, args);
    let old_last = "Empty"
    let last = "";
    let finished = 0;

    message.react("⛔");

    child.stdout.on('data', (data) => {
        last += (`${data}`);
    });
      
    child.stderr.on('data', (data) => {
        last += (`${data}`);
    });

    child.on('error', (data) => {
        last += (`${data}`);
    });

    child.on('exit', () => {
        finished = 1;
    })

    const filter = (reaction, user) => {
        return reaction.emoji.name === '⛔' && user.id === settings.owner_id;
    };
    
    const collector = message.createReactionCollector(filter, { time: 600000 });
    
    collector.on('collect', () => {
        child.kill();
    });
    
    collector.on('end', () => {
        if (!finished) {
            child.kill();
            last += "Timed out."
        }
    });

    let handler = setInterval(() => {
        if (old_last != last && last.length > 0) {
            old_last = last;
            message.edit(treat_output(last));
        }
        if (finished) {
            clearInterval(handler);
            message.reactions.removeAll().then(() => {
                message.react("👍");
            })
            if (last.length < 1) {
                message.edit(treat_output("Empty callback."));
            }
        }
    }, 2000);

}



client.on("ready", async () => {
    console.log('Connected.');
    bot_state = 'idle';
    setInterval(function () {
        client.user.setPresence({ activity: { type: 'WATCHING', name: "droplet - CPU: " + load.average().s1 + "%" }, status: bot_state });
    }, 5000)
});


client.on("message", async message => {
    if (message.author.id === settings.owner_id && message.guild && message.guild.id === settings.owner_server && !message.content.startsWith("//")) {
        if (message.channel.id === settings.exec_channel) {
            if (!message.content.startsWith(settings.cmd_prefix)) {
                const args = (message.content).trim().split(/ +/g);
                const cmd = args.shift();
                message.channel.send('Executing command...').then(message => {
                    execute(message, cmd, args);
                });
            } else {
                return message.channel.send("Commands not supported yet.");
            }
        } else if (message.channel.id === settings.eval_channel) {

        }
    }
})

client.login(tokens.discord);